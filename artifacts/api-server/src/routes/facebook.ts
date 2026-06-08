/**
 * Facebook Lead Ads Webhook Routes
 *
 * GET  /facebook/webhook  — Meta hub challenge verification
 * POST /facebook/webhook  — Real-time leadgen event handler
 *
 * Webhook = Primary path (leads within ~10 seconds)
 * Polling = Fallback (existing 15-min cron via metaLeadSync.ts — unchanged)
 */

import { Router } from "express"
import crypto from "crypto"
import { logger } from "../lib/logger"
import { processLeadGenWebhook } from "../services/facebookLeadWebhook"

const router = Router()

// ─── Signature verification ───────────────────────────────────────────────────

function verifySignature(rawBody: Buffer, signature: string, secret: string): boolean {
  if (!signature.startsWith("sha256=")) return false
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex")
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

// ─── Startup validation ───────────────────────────────────────────────────────

const VERIFY_TOKEN = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || ""
const APP_SECRET   = process.env.FACEBOOK_APP_SECRET || ""

if (!VERIFY_TOKEN) {
  logger.warn("FACEBOOK_WEBHOOK_VERIFY_TOKEN is not set — Facebook Lead Ads webhook will reject all verification requests")
}
if (!APP_SECRET) {
  logger.warn("FACEBOOK_APP_SECRET is not set — webhook signature verification is disabled in development")
}

// ─── GET /facebook/webhook — Meta hub challenge ───────────────────────────────

router.get("/facebook/webhook", (req, res) => {
  const mode      = req.query["hub.mode"]         as string
  const token     = req.query["hub.verify_token"] as string
  const challenge = req.query["hub.challenge"]    as string

  if (!VERIFY_TOKEN) {
    logger.error("Facebook webhook verification attempted but FACEBOOK_WEBHOOK_VERIFY_TOKEN is not set")
    return res.status(403).send("Webhook verify token not configured")
  }

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    logger.info("Facebook Lead Ads webhook verified successfully")
    return res.status(200).send(challenge)
  }

  logger.warn({ mode, tokenMatch: token === VERIFY_TOKEN }, "Facebook webhook: verification failed")
  return res.status(403).send("Verification failed")
})

// ─── POST /facebook/webhook — leadgen event handler ──────────────────────────

router.post("/facebook/webhook", async (req: any, res) => {
  // Always respond 200 immediately so Meta doesn't retry unnecessarily
  res.status(200).send("EVENT_RECEIVED")

  // Signature check (skip in dev if APP_SECRET not configured)
  if (APP_SECRET) {
    const signature = (req.headers["x-hub-signature-256"] as string) ?? ""
    const rawBody: Buffer | undefined = req.rawBody
    if (!rawBody || !verifySignature(rawBody, signature, APP_SECRET)) {
      logger.warn("Facebook webhook: invalid signature, dropping event")
      return
    }
  } else if (process.env.NODE_ENV !== "development") {
    logger.error("FACEBOOK_APP_SECRET not set — dropping webhook event in non-dev environment")
    return
  }

  const body = req.body

  // Validate top-level structure
  if (body?.object !== "page") {
    logger.debug({ object: body?.object }, "Facebook webhook: ignoring non-page event")
    return
  }

  const entries: any[] = body.entry ?? []

  for (const entry of entries) {
    const changes: any[] = entry.changes ?? []

    for (const change of changes) {
      // Only handle leadgen events
      if (change.field !== "leadgen") {
        logger.debug({ field: change.field }, "Facebook webhook: ignoring non-leadgen change")
        continue
      }

      const leadgenId: string | undefined = change.value?.leadgen_id
      const pageId:    string | undefined = change.value?.page_id ?? entry.id

      if (!leadgenId || !pageId) {
        logger.warn({ change }, "Facebook webhook: missing leadgen_id or page_id, skipping")
        continue
      }

      // Process asynchronously so we don't block the response
      processLeadGenWebhook(leadgenId, String(pageId)).catch((err) =>
        logger.error({ err, leadgenId, pageId }, "Facebook webhook: unhandled error in processLeadGenWebhook")
      )
    }
  }
})

export default router
