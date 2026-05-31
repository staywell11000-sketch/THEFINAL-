import { Router } from "express"
import { requireAuth } from "../middlewares/requireAuth"
import { runMetaLeadSync, syncMetaLeadsForAccount } from "../services/metaLeadSync"
import { supabaseAdmin } from "../lib/supabase"
import { logger } from "../lib/logger"

const router = Router()

/**
 * POST /api/lead-sync/trigger
 * Manually trigger a full Meta Lead Ads sync across all connected accounts.
 * Returns immediately with a 202 and fires the sync in the background.
 */
router.post("/lead-sync/trigger", requireAuth, async (_req, res) => {
  try {
    // Fire in background so the HTTP response returns quickly
    runMetaLeadSync()
      .then(({ leadsInserted }) => {
        if (leadsInserted > 0) {
          logger.info({ leadsInserted }, "Manual lead sync: completed with new leads")
        }
      })
      .catch((err) => logger.error({ err }, "Manual lead sync: error"))

    res.status(202).json({ ok: true, message: "Sync triggered — new leads will appear shortly." })
  } catch (err) {
    logger.error({ err }, "Lead sync trigger: unexpected error")
    res.status(500).json({ error: "Failed to trigger sync" })
  }
})

/**
 * POST /api/lead-sync/trigger/:accountId
 * Trigger sync for a specific connected account. Waits for completion.
 */
router.post("/lead-sync/trigger/:accountId", requireAuth, async (req, res) => {
  const { accountId } = req.params
  try {
    const { data: account, error } = await supabaseAdmin
      .from("connected_accounts")
      .select("id, user_id, provider, access_token, metadata")
      .eq("id", accountId)
      .in("provider", ["facebook", "instagram"])
      .eq("status", "active")
      .single()

    if (error || !account) {
      return void res.status(404).json({
        error: "Account not found, inactive, or not a supported ad platform",
      })
    }

    const leadsInserted = await syncMetaLeadsForAccount(account as any)
    res.json({ ok: true, leadsInserted })
  } catch (err) {
    logger.error({ err, accountId }, "Lead sync trigger: error for account")
    res.status(500).json({ error: "Failed to sync account" })
  }
})

export default router
