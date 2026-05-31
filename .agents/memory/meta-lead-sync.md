---
name: Meta Lead Ads sync architecture
description: How the Meta Lead Ads polling/sync service is built and how to extend it for future platforms
---

The sync service lives at `artifacts/api-server/src/services/metaLeadSync.ts`.

**Why:** Designed to be extensible — adding TikTok or Google Ads is just a new function alongside `runMetaLeadSync()`.

**Key decisions:**
- Deduplication: `externalId` column on `leads` table stores Meta's leadgen lead ID. Check before insert.
- Scheduling: `node-cron` every 15 minutes via `startMetaLeadSyncJob()` called from `index.ts`.
- Manual trigger: `POST /api/lead-sync/trigger` (fires-and-forgets) and `POST /api/lead-sync/trigger/:accountId` (waits for result).
- Source tracking: Meta leads get `source = "facebook" | "instagram"`, `campaign`, `adSetName`, `adSource` (ad name), `adCreativeId` (ad ID) from the Leads API.
- Access token: passed in the query string for `/leads` endpoint (Meta requires this for ad account lead fetches).
- Scopes needed: `leads_retrieval,ads_read` added to Facebook OAuth scope; `leads_retrieval` added to Instagram.

**How to apply:**
- To add a new platform (e.g. TikTok): create `services/tiktokLeadSync.ts` with same signature, call from `index.ts`, add route in `leadSync.ts`.
- The `externalId` column must be populated on insert for dedup to work.
