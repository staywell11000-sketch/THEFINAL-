import { schedule } from "node-cron"
import { supabaseAdmin } from "../lib/supabase"
import { db, leadsTable } from "@workspace/db"
import { eq } from "drizzle-orm"
import { logger } from "../lib/logger"

const GRAPH_API_BASE = "https://graph.facebook.com/v18.0"

// ─── Types ────────────────────────────────────────────────

interface MetaLeadFieldData {
  name: string
  values: string[]
}

interface MetaLead {
  id: string
  created_time: string
  field_data: MetaLeadFieldData[]
  campaign_name?: string
  adset_name?: string
  ad_name?: string
  ad_id?: string
}

interface ConnectedAccount {
  id: string
  user_id: string
  provider: string
  access_token: string
  metadata: Record<string, string> | null
}

// ─── Field extraction ─────────────────────────────────────

/** Extract the first value for a named field from Meta's field_data array. */
function extractField(fieldData: MetaLeadFieldData[], ...keys: string[]): string {
  for (const key of keys) {
    const field = fieldData.find((f) => f.name === key)
    if (field?.values?.[0]) return field.values[0]
  }
  return ""
}

// ─── Lead mapping ─────────────────────────────────────────

/**
 * Map a raw Meta lead (from the Leads API) to a row ready for the leadsTable.
 * Field names in Meta's field_data vary by form — we try multiple common keys.
 */
function mapMetaLeadToRow(
  metaLead: MetaLead,
  provider: "facebook" | "instagram"
) {
  const fd = metaLead.field_data ?? []

  const firstName = extractField(fd, "first_name")
  const lastName  = extractField(fd, "last_name")
  const fullName  = extractField(fd, "full_name", "name") ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    "Unknown"

  const email = extractField(fd, "email", "email_address") ||
    `lead-${metaLead.id}@meta-noreply.invalid`

  const phone   = extractField(fd, "phone_number", "phone", "mobile")
  const budget  = extractField(fd, "budget", "price_range", "price")
  const property = extractField(fd, "property_type", "property", "property_interest")

  const label = provider === "facebook" ? "Facebook Lead Ad" : "Instagram Lead Ad"

  return {
    name:         fullName,
    email,
    phone,
    source:       provider,
    campaign:     metaLead.campaign_name ?? null,
    adSetName:    metaLead.adset_name    ?? null,
    adSource:     metaLead.ad_name       ?? null,
    adCreativeId: metaLead.ad_id         ?? null,
    budget,
    property,
    externalId:   metaLead.id,
    status:       "new"  as const,
    priority:     "warm" as const,
    tags:         [label],
    timeline:     [
      {
        id:    `meta-${metaLead.id}`,
        title: `Lead created from ${label}`,
        time:  new Date(metaLead.created_time).toLocaleString(),
      },
    ],
  }
}

// ─── Per-account sync ─────────────────────────────────────

/**
 * Sync Meta Lead Ads for a single connected account.
 * Fetches from /{ad_account_id}/leads, deduplicates by externalId, inserts new rows.
 * Returns the count of newly inserted leads.
 */
export async function syncMetaLeadsForAccount(account: ConnectedAccount): Promise<number> {
  const adAccountId = account.metadata?.ad_account_id
  if (!adAccountId) {
    logger.debug(
      { userId: account.user_id, provider: account.provider },
      "Meta lead sync: no ad_account_id in metadata, skipping"
    )
    return 0
  }

  const provider = account.provider as "facebook" | "instagram"
  const fields   = "id,created_time,field_data,campaign_name,adset_name,ad_name,ad_id"

  // Encode token in the URL — Meta requires it in query string for batch lead fetch
  let url: string | null =
    `${GRAPH_API_BASE}/${adAccountId}/leads` +
    `?fields=${fields}&limit=100&access_token=${encodeURIComponent(account.access_token)}`

  let totalInserted = 0
  let page = 0
  const MAX_PAGES = 10

  while (url && page < MAX_PAGES) {
    page++

    let json: { data?: MetaLead[]; paging?: { next?: string }; error?: { message: string; code: number } }

    try {
      const res = await fetch(url)
      json = (await res.json()) as typeof json

      if (!res.ok || json.error) {
        logger.warn(
          { adAccountId, status: res.status, error: json.error },
          "Meta lead sync: API error, stopping pagination"
        )
        break
      }
    } catch (err) {
      logger.warn({ err, adAccountId }, "Meta lead sync: network error fetching leads page")
      break
    }

    const metaLeads = json.data ?? []
    logger.debug({ adAccountId, count: metaLeads.length, page }, "Meta lead sync: fetched page")

    for (const metaLead of metaLeads) {
      // Dedup: skip if we already have this Meta lead
      const existing = await db
        .select({ id: leadsTable.id })
        .from(leadsTable)
        .where(eq(leadsTable.externalId, metaLead.id))
        .limit(1)

      if (existing.length > 0) continue

      const row = mapMetaLeadToRow(metaLead, provider)

      try {
        await db.insert(leadsTable).values(row)
        totalInserted++
        logger.info(
          { externalId: metaLead.id, provider },
          "Meta lead sync: inserted new lead"
        )
      } catch (err) {
        logger.error({ err, externalId: metaLead.id }, "Meta lead sync: failed to insert lead")
      }
    }

    url = json.paging?.next ?? null
  }

  return totalInserted
}

// ─── Full sync run ────────────────────────────────────────

/**
 * Run the sync across every active Facebook and Instagram connected account
 * that has an ad_account_id configured.
 */
export async function runMetaLeadSync(): Promise<{ accountsChecked: number; leadsInserted: number }> {
  logger.debug("Meta lead sync: starting run")

  const { data: accounts, error } = await supabaseAdmin
    .from("connected_accounts")
    .select("id, user_id, provider, access_token, metadata")
    .in("provider", ["facebook", "instagram"])
    .eq("status", "active")

  if (error) {
    logger.error({ error }, "Meta lead sync: failed to fetch connected accounts")
    return { accountsChecked: 0, leadsInserted: 0 }
  }

  if (!accounts || accounts.length === 0) {
    logger.debug("Meta lead sync: no active Meta accounts, skipping")
    return { accountsChecked: 0, leadsInserted: 0 }
  }

  logger.debug({ count: accounts.length }, "Meta lead sync: processing accounts")

  let leadsInserted = 0

  const results = await Promise.allSettled(
    (accounts as ConnectedAccount[]).map((acct) =>
      syncMetaLeadsForAccount(acct).catch((err) => {
        logger.error({ err, userId: acct.user_id }, "Meta lead sync: uncaught error for account")
        return 0
      })
    )
  )

  for (const result of results) {
    if (result.status === "fulfilled") leadsInserted += result.value
  }

  if (leadsInserted > 0) {
    logger.info({ leadsInserted }, "Meta lead sync: run complete")
  } else {
    logger.debug("Meta lead sync: no new leads found this run")
  }

  return { accountsChecked: accounts.length, leadsInserted }
}

// ─── Scheduled job ────────────────────────────────────────

let syncStarted = false

/**
 * Start the Meta Lead Ads background sync job.
 * Runs every 15 minutes. Safe to call multiple times (no-op after first call).
 * Designed to be extensible — add new ad platforms by calling their sync
 * function from within `runMetaLeadSync` or in a parallel job here.
 */
export function startMetaLeadSyncJob(): void {
  if (syncStarted) return
  syncStarted = true

  schedule("*/15 * * * *", () => {
    runMetaLeadSync().catch((err) =>
      logger.error({ err }, "Meta lead sync: unhandled error in cron handler")
    )
  })

  logger.info("Meta Lead Ads sync job scheduled (every 15 minutes)")
}
