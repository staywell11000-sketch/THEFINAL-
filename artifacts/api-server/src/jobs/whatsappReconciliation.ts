import { schedule } from "node-cron"
import { supabaseAdmin } from "../lib/supabase"
import { logger } from "../lib/logger"

const GRAPH_API_BASE = "https://graph.facebook.com/v18.0"

// How far back to look for missed messages on each run (in minutes).
// Should be at least as large as the cron interval to ensure no gaps.
const LOOKBACK_MINUTES = 15

interface WhatsAppMessage {
  id: string
  from: string
  timestamp: string
  type: string
  text?: { body: string }
}

interface ConnectedAccount {
  user_id: string
  access_token: string
  metadata: Record<string, string> | null
}

/**
 * For a given connected WhatsApp account, fetch recent inbound messages
 * from the Graph API and insert any that are missing from the DB.
 *
 * Note: The WhatsApp Cloud API exposes received messages via the
 * `/v18.0/{phone_number_id}/messages` endpoint only for businesses
 * with advanced access. The endpoint returns a paginated list of
 * messages sent to the phone number. We filter to messages within
 * the lookback window and deduplicate by wamid before inserting.
 */
async function reconcileAccount(account: ConnectedAccount): Promise<void> {
  const phoneNumId = account.metadata?.phone_number_id
  if (!phoneNumId) {
    logger.warn({ userId: account.user_id }, "WhatsApp reconciliation: no phone_number_id in metadata, skipping")
    return
  }

  const since = new Date(Date.now() - LOOKBACK_MINUTES * 60 * 1000)
  const sinceUnix = Math.floor(since.getTime() / 1000)

  let url: string | null =
    `${GRAPH_API_BASE}/${phoneNumId}/messages` +
    `?fields=id,from,timestamp,type,text` +
    `&since=${sinceUnix}` +
    `&limit=100`

  let totalInserted = 0
  let page = 0
  const MAX_PAGES = 5

  while (url && page < MAX_PAGES) {
    page++

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${account.access_token}` },
    })

    if (!res.ok) {
      const errBody = await res.text()
      // 400 / 10 = API doesn't support listing received messages for this tier —
      // this is expected for accounts without advanced access; log at debug level.
      if (res.status === 400 || res.status === 403) {
        logger.debug(
          { phoneNumId, status: res.status, body: errBody },
          "WhatsApp reconciliation: message listing not available for this account (webhook-only tier)"
        )
      } else {
        logger.warn(
          { phoneNumId, status: res.status, body: errBody },
          "WhatsApp reconciliation: failed to fetch messages"
        )
      }
      return
    }

    const json = (await res.json()) as {
      data?: WhatsAppMessage[]
      paging?: { next?: string }
      error?: { message: string; code: number }
    }

    if (json.error) {
      logger.warn(
        { phoneNumId, error: json.error },
        "WhatsApp reconciliation: API returned error"
      )
      return
    }

    const messages = json.data ?? []
    logger.debug({ phoneNumId, count: messages.length, page }, "WhatsApp reconciliation: fetched messages page")

    for (const msg of messages) {
      if (msg.type !== "text") continue

      const wamid   = msg.id
      const content = msg.text?.body ?? ""
      const senderPhone = msg.from

      if (!wamid || !senderPhone) continue

      // Skip messages older than our lookback window
      const msgTs = new Date(Number(msg.timestamp) * 1000)
      if (msgTs < since) continue

      // Deduplicate: skip if already in DB
      const { data: existing } = await supabaseAdmin
        .from("messages")
        .select("id")
        .eq("whatsapp_message_id", wamid)
        .maybeSingle()

      if (existing) continue

      // Find or create contact
      let contactId: string

      const { data: existingContact } = await supabaseAdmin
        .from("contacts")
        .select("id")
        .eq("user_id", account.user_id)
        .eq("phone", senderPhone)
        .maybeSingle()

      if (existingContact) {
        contactId = existingContact.id
      } else {
        const { data: newContact, error: ce } = await supabaseAdmin
          .from("contacts")
          .insert({
            user_id:         account.user_id,
            name:            senderPhone,
            phone:           senderPhone,
            avatar_initials: senderPhone.slice(-2).toUpperCase(),
          })
          .select("id")
          .single()

        if (ce || !newContact) {
          logger.error({ ce, senderPhone }, "WhatsApp reconciliation: failed to create contact")
          continue
        }
        contactId = newContact.id
      }

      // Find or create conversation
      let conversationId: string

      const { data: existingConv } = await supabaseAdmin
        .from("conversations")
        .select("id")
        .eq("user_id", account.user_id)
        .eq("contact_id", contactId)
        .eq("channel", "whatsapp")
        .maybeSingle()

      if (existingConv) {
        conversationId = existingConv.id
      } else {
        const { data: newConv, error: ve } = await supabaseAdmin
          .from("conversations")
          .insert({
            user_id:         account.user_id,
            contact_id:      contactId,
            channel:         "whatsapp",
            title:           senderPhone,
            status:          "active",
            last_message_at: msgTs.toISOString(),
            unread_count:    0,
          })
          .select("id")
          .single()

        if (ve || !newConv) {
          logger.error({ ve }, "WhatsApp reconciliation: failed to create conversation")
          continue
        }
        conversationId = newConv.id
      }

      // Insert the missing inbound message
      const { error: me } = await supabaseAdmin
        .from("messages")
        .insert({
          conversation_id:     conversationId,
          sender_id:           account.user_id,
          content,
          type:                "text",
          status:              "delivered",
          direction:           "inbound",
          whatsapp_message_id: wamid,
          created_at:          msgTs.toISOString(),
        })

      if (me) {
        logger.error({ me, wamid }, "WhatsApp reconciliation: failed to insert message")
        continue
      }

      // Update conversation preview & unread count
      await supabaseAdmin
        .from("conversations")
        .update({
          last_message:    content,
          last_message_at: msgTs.toISOString(),
        })
        .eq("id", conversationId)

      await supabaseAdmin.rpc("increment_unread_count", { conv_id: conversationId })

      totalInserted++
      logger.info({ wamid, conversationId }, "WhatsApp reconciliation: inserted missed message")
    }

    url = json.paging?.next ?? null
  }

  if (totalInserted > 0) {
    logger.info({ phoneNumId, totalInserted }, "WhatsApp reconciliation: run complete")
  } else {
    logger.debug({ phoneNumId }, "WhatsApp reconciliation: no missed messages found")
  }
}

/**
 * Runs the WhatsApp message reconciliation across all active connected accounts.
 */
async function runReconciliation(): Promise<void> {
  logger.debug("WhatsApp reconciliation: starting run")

  const { data: accounts, error } = await supabaseAdmin
    .from("connected_accounts")
    .select("user_id, access_token, metadata")
    .eq("provider", "whatsapp")
    .eq("status", "active")

  if (error) {
    logger.error({ error }, "WhatsApp reconciliation: failed to fetch connected accounts")
    return
  }

  if (!accounts || accounts.length === 0) {
    logger.debug("WhatsApp reconciliation: no active WhatsApp accounts, skipping")
    return
  }

  logger.debug({ count: accounts.length }, "WhatsApp reconciliation: processing accounts")

  await Promise.allSettled(
    (accounts as ConnectedAccount[]).map((acct) =>
      reconcileAccount(acct).catch((err) =>
        logger.error({ err, userId: acct.user_id }, "WhatsApp reconciliation: uncaught error for account")
      )
    )
  )
}

/**
 * Starts the background WhatsApp reconciliation cron job.
 * Runs every 10 minutes. Safe to call multiple times (no-op after first call).
 */
let started = false

export function startWhatsAppReconciliationJob(): void {
  if (started) return
  started = true

  // Run every 10 minutes: "*/10 * * * *"
  schedule("*/10 * * * *", () => {
    runReconciliation().catch((err) =>
      logger.error({ err }, "WhatsApp reconciliation: unhandled error in cron handler")
    )
  })

  logger.info("WhatsApp reconciliation job scheduled (every 10 minutes)")
}
