import { Router } from "express"
import crypto from "crypto"
import { requireAuth } from "../middlewares/requireAuth"
import { supabaseAdmin } from "../lib/supabase"

const router = Router()

// ─── OAuth endpoints ──────────────────────────────────────

const META_AUTH_URL   = "https://www.facebook.com/v18.0/dialog/oauth"
const META_TOKEN_URL  = "https://graph.facebook.com/v18.0/oauth/access_token"
const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize"
const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/"
const TIKTOK_USER_URL  = "https://open.tiktokapis.com/v2/user/info/"

type Provider = "whatsapp" | "facebook" | "instagram" | "tiktok"
const VALID_PROVIDERS: Provider[] = ["whatsapp", "facebook", "instagram", "tiktok"]

const META_SCOPES: Record<string, string> = {
  whatsapp:  "whatsapp_business_messaging,whatsapp_business_management,pages_show_list",
  // leads_retrieval = access Lead Ads form submissions; ads_read = read ad account data for syncing
  facebook:  "email,public_profile,pages_show_list,pages_read_engagement,leads_retrieval,ads_read",
  instagram: "instagram_basic,instagram_content_publish,pages_show_list,leads_retrieval",
}

// ─── URL helpers ──────────────────────────────────────────

function getApiBaseUrl(): string {
  if (process.env.API_URL) return process.env.API_URL
  // On Replit, port 8080 is exposed at externalPort 8080 and the proxy serves /api at port 80
  // Meta OAuth requires a publicly reachable redirect_uri — use the Replit dev domain without port
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`
  return "http://localhost:8080"
}

function callbackUrl(provider: string): string {
  return `${getApiBaseUrl()}/api/connected-accounts/callback/${provider}`
}

// ─── State encoding ───────────────────────────────────────

interface OAuthState {
  userId: string
  provider: string
  returnUrl: string
  nonce: string
  ts: number
  cv?: string // TikTok PKCE code_verifier
}

function encodeState(data: OAuthState): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url")
}

function decodeState(raw: string): OAuthState | null {
  try {
    const data = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as OAuthState
    if (!data.userId || !data.provider || !data.returnUrl) return null
    if (Date.now() - data.ts > 30 * 60 * 1000) return null // stale after 30 min
    return data
  } catch {
    return null
  }
}

// ─── Routes ───────────────────────────────────────────────

// GET /api/connected-accounts
router.get("/connected-accounts", requireAuth, async (req: any, res) => {
  const { data, error } = await supabaseAdmin
    .from("connected_accounts")
    .select("id, user_id, provider, account_name, account_id, status, last_synced_at, created_at")
    .eq("user_id", req.userId)
    .order("provider", { ascending: true })

  if (error) return res.status(500).json({ error: error.message })
  return res.json(data ?? [])
})

// GET /api/connected-accounts/oauth-url/:provider?returnUrl=...
router.get("/connected-accounts/oauth-url/:provider", requireAuth, async (req: any, res) => {
  const provider = req.params.provider as Provider

  if (!VALID_PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: "Invalid provider" })
  }

  const returnUrl = (req.query.returnUrl as string) || getApiBaseUrl()

  if (provider === "whatsapp" || provider === "facebook" || provider === "instagram") {
    const appId = process.env.FACEBOOK_APP_ID
    if (!appId) {
      return res.status(503).json({
        configured: false,
        error: "FACEBOOK_APP_ID is not set. Add it in your Replit environment secrets.",
        envVars: ["FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET"],
      })
    }

    const state = encodeState({
      userId: req.userId,
      provider,
      returnUrl,
      nonce: crypto.randomUUID(),
      ts: Date.now(),
    })

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: callbackUrl(provider),
      scope: META_SCOPES[provider],
      state,
      response_type: "code",
    })

    return res.json({ configured: true, url: `${META_AUTH_URL}?${params}` })
  }

  if (provider === "tiktok") {
    const clientKey = process.env.TIKTOK_CLIENT_KEY
    if (!clientKey) {
      return res.status(503).json({
        configured: false,
        error: "TIKTOK_CLIENT_KEY is not set. Add it in your Replit environment secrets.",
        envVars: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
      })
    }

    // TikTok v2 uses PKCE — encode code_verifier in state so we can retrieve it in callback
    const codeVerifier = crypto.randomBytes(32).toString("base64url")
    const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url")

    const state = encodeState({
      userId: req.userId,
      provider,
      returnUrl,
      nonce: crypto.randomUUID(),
      ts: Date.now(),
      cv: codeVerifier,
    })

    const params = new URLSearchParams({
      client_key: clientKey,
      redirect_uri: callbackUrl(provider),
      scope: "user.info.basic",
      state,
      response_type: "code",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    })

    return res.json({ configured: true, url: `${TIKTOK_AUTH_URL}?${params}` })
  }
})

// GET /api/connected-accounts/callback/:provider  (no auth — OAuth redirect target)
router.get("/connected-accounts/callback/:provider", async (req, res) => {
  const provider = req.params.provider as Provider
  const { code, state: stateRaw, error: oauthError } = req.query as Record<string, string>

  const stateData = stateRaw ? decodeState(stateRaw) : null
  const returnUrl  = stateData?.returnUrl || getApiBaseUrl()

  const redirectError = (msg: string) =>
    res.redirect(`${returnUrl}?tab=accounts&error=${encodeURIComponent(msg)}&provider=${provider}`)

  if (oauthError) return redirectError(oauthError)
  if (!code || !stateData) return redirectError("Invalid or expired state. Please try again.")

  const { userId, cv: codeVerifier } = stateData
  const cb = callbackUrl(provider)

  try {
    let accessToken = ""
    let accountName = ""
    let accountId   = ""
    let metadata: Record<string, unknown> | null = null

    // ── Meta (Facebook / Instagram / WhatsApp) ──────────
    if (provider === "facebook" || provider === "instagram" || provider === "whatsapp") {
      const appId     = process.env.FACEBOOK_APP_ID!
      const appSecret = process.env.FACEBOOK_APP_SECRET!

      if (!appId || !appSecret) return redirectError("Server not configured for Meta OAuth.")

      const tokenRes = await fetch(
        `${META_TOKEN_URL}?client_id=${appId}&client_secret=${appSecret}` +
        `&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(cb)}`
      )
      const tokenJson = await tokenRes.json() as any
      if (!tokenJson.access_token) {
        throw new Error(tokenJson?.error?.message || "Meta token exchange failed")
      }
      accessToken = tokenJson.access_token

      const profileRes  = await fetch(`https://graph.facebook.com/me?fields=id,name&access_token=${accessToken}`)
      const profileJson = await profileRes.json() as any
      accountId   = String(profileJson.id ?? "")
      accountName = String(profileJson.name ?? "")

      // ── For WhatsApp: resolve phone_number_id and WABA ID ──
      if (provider === "whatsapp") {
        try {
          // Fetch WABA accounts linked to this user token
          const wabaListRes  = await fetch(
            `https://graph.facebook.com/v18.0/${accountId}/whatsapp_business_accounts?access_token=${accessToken}`
          )
          const wabaListJson = await wabaListRes.json() as any
          const wabaId = wabaListJson?.data?.[0]?.id as string | undefined

          if (wabaId) {
            // Fetch phone numbers under this WABA
            const phoneRes  = await fetch(
              `https://graph.facebook.com/v18.0/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${accessToken}`
            )
            const phoneJson = await phoneRes.json() as any
            const phoneNumId = phoneJson?.data?.[0]?.id as string | undefined

            // Store in metadata for later use in send/webhook
            metadata = { waba_id: wabaId, phone_number_id: phoneNumId ?? null }
          }
        } catch (waErr) {
          // Non-fatal: account still stored, operators can configure manually
          console.warn("Could not resolve WhatsApp phone_number_id:", waErr)
        }
      }
    }

    // ── TikTok ──────────────────────────────────────────
    else if (provider === "tiktok") {
      const clientKey    = process.env.TIKTOK_CLIENT_KEY!
      const clientSecret = process.env.TIKTOK_CLIENT_SECRET!

      if (!clientKey || !clientSecret) return redirectError("Server not configured for TikTok OAuth.")

      const body = new URLSearchParams({
        client_key:    clientKey,
        client_secret: clientSecret,
        code,
        grant_type:    "authorization_code",
        redirect_uri:  cb,
        code_verifier: codeVerifier ?? "",
      })
      const tokenRes  = await fetch(TIKTOK_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      })
      const tokenJson = await tokenRes.json() as any
      if (!tokenJson?.data?.access_token) {
        throw new Error(tokenJson?.message || "TikTok token exchange failed")
      }
      accessToken = tokenJson.data.access_token

      const userRes  = await fetch(`${TIKTOK_USER_URL}?fields=open_id,display_name`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const userJson = await userRes.json() as any
      accountId   = String(userJson?.data?.user?.open_id   ?? "")
      accountName = String(userJson?.data?.user?.display_name ?? "")
    } else {
      return redirectError("Unknown provider.")
    }

    // ── Upsert into Supabase ─────────────────────────────
    const upsertRow: Record<string, unknown> = {
      user_id:        userId,
      provider,
      account_name:   accountName || null,
      account_id:     accountId   || null,
      access_token:   accessToken,
      status:         "active",
      last_synced_at: new Date().toISOString(),
      updated_at:     new Date().toISOString(),
    }
    if (metadata !== null) upsertRow.metadata = metadata

    const { error: dbErr } = await supabaseAdmin
      .from("connected_accounts")
      .upsert(upsertRow, { onConflict: "user_id,provider" })

    if (dbErr) throw dbErr

    return res.redirect(`${returnUrl}?tab=accounts&connected=${provider}`)
  } catch (err: any) {
    return redirectError(err?.message ?? "Connection failed. Please try again.")
  }
})

// GET /api/connected-accounts/:id/pages
router.get("/connected-accounts/:id/pages", requireAuth, async (req: any, res) => {
  const { data: account, error } = await supabaseAdmin
    .from("connected_accounts")
    .select("access_token, provider, user_id")
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .single()

  if (error || !account) return res.status(404).json({ error: "Account not found" })
  if (account.provider !== "facebook" && account.provider !== "instagram") {
    return res.status(400).json({ error: "Pages only available for Facebook/Instagram accounts" })
  }

  try {
    const pagesRes = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,category,fan_count&access_token=${account.access_token}`
    )
    const pagesJson = await pagesRes.json() as any
    if (pagesJson.error) throw new Error(pagesJson.error.message)
    return res.json(pagesJson.data ?? [])
  } catch (err: any) {
    return res.status(502).json({ error: err.message ?? "Failed to fetch pages" })
  }
})

// GET /api/connected-accounts/:id/ad-accounts
router.get("/connected-accounts/:id/ad-accounts", requireAuth, async (req: any, res) => {
  const { data: account, error } = await supabaseAdmin
    .from("connected_accounts")
    .select("access_token, provider, user_id, account_id")
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .single()

  if (error || !account) return res.status(404).json({ error: "Account not found" })

  try {
    const userId = account.account_id
    const adAccRes = await fetch(
      `https://graph.facebook.com/v18.0/${userId}/adaccounts?fields=id,name,account_status,currency,lead_gen_enabled&access_token=${account.access_token}`
    )
    const adAccJson = await adAccRes.json() as any
    if (adAccJson.error) throw new Error(adAccJson.error.message)
    return res.json(adAccJson.data ?? [])
  } catch (err: any) {
    return res.status(502).json({ error: err.message ?? "Failed to fetch ad accounts" })
  }
})

// PATCH /api/connected-accounts/:id/metadata
router.patch("/connected-accounts/:id/metadata", requireAuth, async (req: any, res) => {
  const allowed = ["selected_page_id", "selected_page_name", "selected_ad_account_id",
                   "selected_ad_account_name", "sync_interval_minutes", "default_pipeline",
                   "default_agent", "extra_tags"]
  const patch: Record<string, unknown> = {}
  for (const key of allowed) {
    if (req.body[key] !== undefined) patch[key] = req.body[key]
  }
  if (Object.keys(patch).length === 0) return res.status(400).json({ error: "No valid fields" })

  const { data: existing } = await supabaseAdmin
    .from("connected_accounts")
    .select("metadata, user_id")
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .single()

  if (!existing) return res.status(404).json({ error: "Account not found" })

  const { error } = await supabaseAdmin
    .from("connected_accounts")
    .update({ metadata: { ...(existing.metadata as object ?? {}), ...patch } })
    .eq("id", req.params.id)
    .eq("user_id", req.userId)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(204).send()
})

// DELETE /api/connected-accounts/:id
router.delete("/connected-accounts/:id", requireAuth, async (req: any, res) => {
  const { error } = await supabaseAdmin
    .from("connected_accounts")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.userId) // ensure ownership

  if (error) return res.status(500).json({ error: error.message })
  return res.status(204).send()
})

export default router
