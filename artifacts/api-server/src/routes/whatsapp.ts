import { Router } from "express"
import crypto from "crypto"
import { requireAuth } from "../middlewares/requireAuth"
import { supabaseAdmin } from "../lib/supabase"
import { logger } from "../lib/logger"

const router = Router()

const GRAPH_API_BASE = "https://graph.facebook.com/v18.0"

// ─── Signature verification ──────────────────────────────

function verifySignature(rawBody: Buffer, signature: string, secret: string): boolean {
  if (!signature.startsWith("sha256=")) return false
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex")
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

// ─── GET /api/whatsapp/webhook — Meta hub challenge ──────

router.get("/whatsapp/webhook", (req, res) => {
  const mode      = req.query["hub.mode"]         as string
  const token     = req.query["hub.verify_token"] as string
  const challenge = req.query["hub.challenge"]    as string

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? ""
  if (!verifyToken) {
    logger.warn("WHATSAPP_WEBHOOK_VERIFY_TOKEN is not set")
    return res.status(403).send("Webhook verify token not configured")
  }

  if (mode === "subscribe" && token === verifyToken) {
    logger.info("WhatsApp webhook verified successfully")
    return res.status(200).send(challenge)
  }

  return res.status(403).send("Verification failed")
})

// ─── POST /api/whatsapp/webhook — inbound events ─────────

router.post("/whatsapp/webhook", async (req: any, res) => {
  const appSecret = process.env.FACEBOOK_APP_SECRET ?? ""

  if (appSecret) {
    const signature = (req.headers["x-hub-signature-256"] as string) ?? ""
    const rawBody: Buffer | undefined = req.rawBody
    if (!rawBody || !verifySignature(rawBody, signature, appSecret)) {
      logger.warn("WhatsApp webhook: invalid signature")
      return res.status(401).send("Invalid signature")
    }
  } else {
    // In production, reject unauthenticated webhook requests when secret is missing
    // Allow only in explicit development mode
    if (process.env.NODE_ENV !== "development") {
      logger.error("FACEBOOK_APP_SECRET not set — rejecting webhook request in non-dev environment")
      return res.status(401).send("Webhook not configured")
    }
    logger.warn("FACEBOOK_APP_SECRET not set — skipping signature check (development mode only)")
  }

  res.status(200).send("EVENT_RECEIVED")

  try {
    const body = req.body
    if (body?.object !== "whatsapp_business_account") return

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") continue
        const value = change.value

        // ── Status updates ──────────────────────────────
        for (const statusEvt of value.statuses ?? []) {
          const wamid     = statusEvt.id     as string
          const newStatus = statusEvt.status as string

          const mappedStatus =
            newStatus === "delivered" ? "delivered" :
            newStatus === "read"      ? "read"      : null

          if (mappedStatus) {
            const { error } = await supabaseAdmin
              .from("messages")
              .update({ status: mappedStatus })
              .eq("whatsapp_message_id", wamid)

            if (error) logger.error({ error, wamid }, "Failed to update message status")
          }
        }

        // ── Inbound messages ────────────────────────────
        for (const msg of value.messages ?? []) {
          if (msg.type !== "text") continue

          const senderPhone  = msg.from   as string
          const wamid        = msg.id     as string
          const content      = (msg.text?.body as string) ?? ""
          const phoneNumId   = value.metadata?.phone_number_id as string | undefined

          // Find the connected account owner by phone_number_id in metadata
          let ownerUserId: string | null = null
          if (phoneNumId) {
            const { data: accounts } = await supabaseAdmin
              .from("connected_accounts")
              .select("user_id, metadata")
              .eq("provider", "whatsapp")
              .eq("status", "active")

            for (const acct of accounts ?? []) {
              const meta = acct.metadata as Record<string, string> | null
              if (meta?.phone_number_id === phoneNumId) {
                ownerUserId = acct.user_id
                break
              }
            }
          }

          if (!ownerUserId) {
            logger.warn({ phoneNumId }, "No connected WhatsApp account found for incoming message")
            continue
          }

          // Find or create contact by phone number
          let contactId: string

          const { data: existingContact } = await supabaseAdmin
            .from("contacts")
            .select("id")
            .eq("user_id", ownerUserId)
            .eq("phone", senderPhone)
            .maybeSingle()

          if (existingContact) {
            contactId = existingContact.id
          } else {
            const displayName = value.contacts?.[0]?.profile?.name ?? senderPhone
            const initials = displayName
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)

            const { data: newContact, error: ce } = await supabaseAdmin
              .from("contacts")
              .insert({
                user_id:         ownerUserId,
                name:            displayName,
                phone:           senderPhone,
                avatar_initials: initials,
              })
              .select("id")
              .single()

            if (ce || !newContact) {
              logger.error({ ce }, "Failed to create contact for inbound WhatsApp message")
              continue
            }
            contactId = newContact.id
          }

          // Find or create conversation (channel = 'whatsapp')
          let conversationId: string

          const { data: existingConv } = await supabaseAdmin
            .from("conversations")
            .select("id")
            .eq("user_id", ownerUserId)
            .eq("contact_id", contactId)
            .eq("channel", "whatsapp")
            .maybeSingle()

          if (existingConv) {
            conversationId = existingConv.id
          } else {
            const displayName = value.contacts?.[0]?.profile?.name ?? senderPhone
            const { data: newConv, error: ve } = await supabaseAdmin
              .from("conversations")
              .insert({
                user_id:         ownerUserId,
                contact_id:      contactId,
                channel:         "whatsapp",
                title:           displayName,
                status:          "active",
                last_message_at: new Date().toISOString(),
                unread_count:    1,
              })
              .select("id")
              .single()

            if (ve || !newConv) {
              logger.error({ ve }, "Failed to create conversation for inbound WhatsApp message")
              continue
            }
            conversationId = newConv.id
          }

          // Deduplicate by wamid
          const { data: dup } = await supabaseAdmin
            .from("messages")
            .select("id")
            .eq("whatsapp_message_id", wamid)
            .maybeSingle()

          if (dup) continue

          // Insert the inbound message row
          const { error: me } = await supabaseAdmin
            .from("messages")
            .insert({
              conversation_id:     conversationId,
              sender_id:           ownerUserId,
              content,
              type:                "text",
              status:              "delivered",
              direction:           "inbound",
              whatsapp_message_id: wamid,
            })

          if (me) {
            logger.error({ me }, "Failed to insert inbound WhatsApp message")
            continue
          }

          // Update conversation last_message + increment unread_count
          await supabaseAdmin
            .from("conversations")
            .update({
              last_message:    content,
              last_message_at: new Date().toISOString(),
            })
            .eq("id", conversationId)

          // Increment unread_count separately
          await supabaseAdmin.rpc("increment_unread_count", { conv_id: conversationId })
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "Error processing WhatsApp webhook")
  }
})

// ─── POST /api/whatsapp/send ─────────────────────────────

router.post("/whatsapp/send", requireAuth, async (req: any, res) => {
  const { conversationId, content } = req.body as { conversationId: string; content: string }

  if (!conversationId || !content?.trim()) {
    return res.status(400).json({ error: "conversationId and content are required" })
  }

  try {
    // Get conversation + contact phone — scope to req.userId to prevent IDOR
    const { data: conv, error: ce } = await supabaseAdmin
      .from("conversations")
      .select("id, channel, contact:contacts(phone)")
      .eq("id", conversationId)
      .eq("user_id", req.userId)
      .single()

    if (ce || !conv) return res.status(404).json({ error: "Conversation not found" })

    const channel = (conv as any).channel as string
    if (channel !== "whatsapp") {
      return res.status(400).json({ error: "Conversation is not a WhatsApp channel" })
    }

    const recipientPhone = (conv as any).contact?.phone as string | null
    if (!recipientPhone) {
      return res.status(400).json({ error: "Contact has no phone number" })
    }

    // Get WhatsApp connected account for this user
    const { data: account, error: ae } = await supabaseAdmin
      .from("connected_accounts")
      .select("access_token, metadata")
      .eq("user_id", req.userId)
      .eq("provider", "whatsapp")
      .eq("status", "active")
      .single()

    if (ae || !account) {
      return res.status(400).json({ error: "No active WhatsApp account connected" })
    }

    const meta         = (account as any).metadata as Record<string, string> | null
    const phoneNumId   = meta?.phone_number_id
    const accessToken  = (account as any).access_token as string

    if (!phoneNumId) {
      return res.status(400).json({ error: "Phone number ID not found — reconnect your WhatsApp account" })
    }

    // Call WhatsApp Cloud API
    const waRes = await fetch(`${GRAPH_API_BASE}/${phoneNumId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type:    "individual",
        to:                recipientPhone,
        type:              "text",
        text:              { preview_url: false, body: content },
      }),
    })

    const waJson = await waRes.json() as any

    if (!waRes.ok || !waJson.messages?.[0]?.id) {
      const errMsg = waJson?.error?.message ?? "WhatsApp API request failed"
      logger.error({ waJson }, "WhatsApp send failed")
      return res.status(502).json({ error: errMsg })
    }

    const wamid = waJson.messages[0].id as string

    // Insert message row only after confirmed API response
    const { data: message, error: me } = await supabaseAdmin
      .from("messages")
      .insert({
        conversation_id:     conversationId,
        sender_id:           req.userId,
        content,
        type:                "text",
        status:              "sent",
        direction:           "outbound",
        whatsapp_message_id: wamid,
      })
      .select()
      .single()

    if (me || !message) {
      logger.error({ me }, "Failed to insert outbound WhatsApp message")
      return res.status(500).json({ error: "Message sent but failed to save" })
    }

    // Update conversation last_message
    await supabaseAdmin
      .from("conversations")
      .update({
        last_message:    content,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversationId)

    return res.json({ message })
  } catch (err: any) {
    logger.error({ err }, "Error in /whatsapp/send")
    return res.status(500).json({ error: err?.message ?? "Internal server error" })
  }
})

export default router
