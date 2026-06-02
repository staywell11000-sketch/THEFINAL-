// ── Types ─────────────────────────────────────────────────────────────────
export type Platform = "facebook" | "instagram" | "tiktok" | "whatsapp"
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "syncing" | "error" | "paused"

export type MockAdAccount = {
  id: string
  name: string
  currency: string
  campaigns: string[]
  leadsEstimate: number
}

export type MockBusiness = {
  id: string
  name: string
  adAccounts: MockAdAccount[]
}

export type MockProfile = {
  id: string
  displayName: string
  email?: string
  avatar?: string
  businesses?: MockBusiness[]
  adAccounts?: MockAdAccount[]
}

export type MockWhatsAppProfile = {
  id: string
  phone: string
  name: string
  category: string
}

export type MockWebsiteForm = {
  id: string
  name: string
  url: string
  platform: string
  fields: string[]
}

export type Integration = {
  id: string
  platform: Platform
  status: ConnectionStatus
  accountName: string
  accountId: string
  adAccountName?: string
  connectedAt: string
  lastSync: string | null
  nextSync: string | null
  leadsTotal: number
  leadsSyncedToday: number
  leadsSyncedThisWeek: number
  campaigns: string[]
  syncIntervalMinutes: number
  defaultPipeline: string
  defaultAgent: string
  extraTags: string[]
  errorMessage?: string
  webhookUrl?: string
}

export type SyncEvent = {
  id: string
  platform: Platform
  accountName: string
  timestamp: string
  leadsAdded: number
  status: "success" | "error" | "partial"
  message: string
}

// ── Platform configs ──────────────────────────────────────────────────────
export type PlatformConfig = {
  id: Platform
  name: string
  category: string
  tagline: string
  description: string
  brandColor: string
  gradient: string
  lightBg: string
  iconBg: string
  features: string[]
  connectSteps: string[]
}

export const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  facebook: {
    id: "facebook",
    name: "Facebook Ads",
    category: "Paid Social",
    tagline: "Capture leads from Facebook Lead Gen campaigns automatically",
    description: "Connect your Facebook Ads account to sync leads from Lead Generation campaigns directly into your CRM with full campaign and ad attribution.",
    brandColor: "#1877F2",
    gradient: "from-blue-600 to-blue-500",
    lightBg: "bg-blue-500/10",
    iconBg: "bg-blue-600",
    features: [
      "Real-time lead sync from Lead Gen campaigns",
      "Campaign and ad-level attribution on every lead",
      "Audience insights and targeting data",
      "Automatic deduplication against existing leads",
    ],
    connectSteps: ["Sign in to Facebook", "Select Business", "Choose Ad Account", "Configure sync"],
  },
  instagram: {
    id: "instagram",
    name: "Instagram Ads",
    category: "Paid Social",
    tagline: "Sync leads from Instagram Lead Gen and Story ads",
    description: "Connect your Instagram Ads (via Meta Business Manager) to capture leads from Lead Generation ads, Story swipe-ups, and DM campaigns.",
    brandColor: "#E1306C",
    gradient: "from-pink-600 via-rose-500 to-orange-400",
    lightBg: "bg-pink-500/10",
    iconBg: "bg-gradient-to-br from-purple-600 to-pink-500",
    features: [
      "Lead sync from Instagram Lead Gen ads",
      "Story and Reels campaign attribution",
      "Profile visit and DM tracking",
      "Syncs every 30 minutes automatically",
    ],
    connectSteps: ["Sign in to Instagram", "Select Business", "Choose Ad Account", "Configure sync"],
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok Ads",
    category: "Paid Social",
    tagline: "Capture leads from TikTok Lead Generation campaigns",
    description: "Connect TikTok Ads Manager to automatically sync leads from TikTok Lead Generation forms into your CRM with full campaign attribution.",
    brandColor: "#010101",
    gradient: "from-zinc-800 to-zinc-700",
    lightBg: "bg-zinc-500/10",
    iconBg: "bg-zinc-900",
    features: [
      "Lead sync from TikTok Lead Gen forms",
      "Campaign, ad group, and ad attribution",
      "Audience demographic data",
      "Syncs every 30 minutes automatically",
    ],
    connectSteps: ["Sign in to TikTok Ads", "Select Ads Account", "Choose campaigns", "Configure sync"],
  },
  whatsapp: {
    id: "whatsapp",
    name: "WhatsApp Business",
    category: "Messaging",
    tagline: "Convert WhatsApp inquiries into CRM leads automatically",
    description: "Connect your WhatsApp Business account to automatically create CRM leads from inbound messages, inquiry keywords, and chatbot interactions.",
    brandColor: "#25D366",
    gradient: "from-emerald-600 to-green-500",
    lightBg: "bg-emerald-500/10",
    iconBg: "bg-emerald-600",
    features: [
      "Auto-create leads from inbound messages",
      "Keyword-triggered lead capture",
      "Message history attached to lead profile",
      "Two-way message sync with CRM",
    ],
    connectSteps: ["Enter phone number", "Verify number", "Select Business Profile", "Configure triggers"],
  },
}

// ── Mock profiles for simulated auth ─────────────────────────────────────
export const MOCK_META_PROFILES: MockProfile[] = [
  {
    id: "meta_1",
    displayName: "James Donovan",
    email: "jdonovan@luxestate.com",
    businesses: [
      {
        id: "biz_luxestate",
        name: "LuxeState Realty LLC",
        adAccounts: [
          { id: "act_1234", name: "LuxeState Main (act_1234)", currency: "USD", campaigns: ["Manhattan Penthouse Q2", "Beverly Hills Spring", "NYC Luxury Reach"], leadsEstimate: 47 },
          { id: "act_5678", name: "LuxeState Properties (act_5678)", currency: "USD", campaigns: ["Summer 2026 Listings", "High-Net-Worth Retargeting"], leadsEstimate: 28 },
        ],
      },
    ],
  },
  {
    id: "meta_2",
    displayName: "Sarah Mitchell",
    email: "smitchell@luxestate.com",
    businesses: [
      {
        id: "biz_jdp",
        name: "JD Properties Group",
        adAccounts: [
          { id: "act_9012", name: "JD Properties Ads (act_9012)", currency: "USD", campaigns: ["Ultra-Luxury Q2 2026", "Malibu Beach Series"], leadsEstimate: 19 },
        ],
      },
    ],
  },
]

export const MOCK_TIKTOK_PROFILES: MockProfile[] = [
  {
    id: "tiktok_1",
    displayName: "LuxeState Realty",
    email: "ads@luxestate.com",
    adAccounts: [
      { id: "tt_7891", name: "LuxeState Realty (#7891)", currency: "USD", campaigns: ["Luxury Homes Showcase", "Penthouse Series", "Miami Condo Reach"], leadsEstimate: 31 },
    ],
  },
  {
    id: "tiktok_2",
    displayName: "LuxeRealty Agency",
    email: "agency@luxestate.com",
    adAccounts: [
      { id: "tt_5559", name: "Agency Account (#5559)", currency: "USD", campaigns: ["Agent Brand Campaign"], leadsEstimate: 12 },
    ],
  },
]

export const MOCK_WHATSAPP_PROFILES: MockWhatsAppProfile[] = [
  { id: "wa_1", phone: "+1 (555) 123-4567", name: "LuxeState Concierge", category: "Real Estate" },
  { id: "wa_2", phone: "+1 (888) 555-0100", name: "LuxeState Properties", category: "Real Estate" },
  { id: "wa_3", phone: "+1 (212) 555-0199", name: "JD Properties Hotline", category: "Real Estate" },
]

export const MOCK_WEBSITE_FORMS: MockWebsiteForm[] = [
  { id: "wf_1", name: "Contact Form", url: "luxestate.com/contact", platform: "Custom HTML", fields: ["Name", "Email", "Phone", "Message"] },
  { id: "wf_2", name: "Property Inquiry", url: "luxestate.com/property/inquiry", platform: "WordPress", fields: ["Name", "Email", "Property Interest", "Budget", "Message"] },
  { id: "wf_3", name: "Schedule Viewing", url: "luxestate.com/schedule", platform: "Webflow", fields: ["First Name", "Last Name", "Email", "Phone", "Preferred Date"] },
]

export const WEBSITE_PLATFORMS = ["Custom HTML", "WordPress", "Webflow", "Squarespace", "Wix", "HubSpot", "Other"]

// ── localStorage store ────────────────────────────────────────────────────
const INTEGRATIONS_KEY = "luxestate_integrations_v1"
const SYNC_LOG_KEY = "luxestate_sync_log_v1"

export function getIntegrations(): Integration[] {
  try {
    return JSON.parse(localStorage.getItem(INTEGRATIONS_KEY) ?? "[]")
  } catch { return [] }
}

export function saveIntegrations(integrations: Integration[]): void {
  localStorage.setItem(INTEGRATIONS_KEY, JSON.stringify(integrations))
}

export function getIntegration(platform: Platform): Integration | null {
  return getIntegrations().find((i) => i.platform === platform) ?? null
}

export function upsertIntegration(integration: Integration): void {
  const all = getIntegrations().filter((i) => i.platform !== integration.platform)
  saveIntegrations([...all, integration])
}

export function removeIntegration(platform: Platform): void {
  saveIntegrations(getIntegrations().filter((i) => i.platform !== platform))
}

export function getSyncLog(): SyncEvent[] {
  try {
    return JSON.parse(localStorage.getItem(SYNC_LOG_KEY) ?? "[]")
  } catch { return [] }
}

export function addSyncEvent(event: Omit<SyncEvent, "id">): void {
  const log = getSyncLog()
  log.unshift({ ...event, id: `sync_${Date.now()}` })
  localStorage.setItem(SYNC_LOG_KEY, JSON.stringify(log.slice(0, 100)))
}

// ── Sync helpers ──────────────────────────────────────────────────────────
export function generateWebhookUrl(platform: Platform, integrationId: string): string {
  return `https://hooks.luxestate.io/leads/${platform}/${integrationId.slice(-8)}`
}

export function getNextSyncTime(intervalMinutes: number): string {
  return new Date(Date.now() + intervalMinutes * 60 * 1000).toISOString()
}

export function isOverdueForSync(integration: Integration): boolean {
  if (!integration.nextSync || integration.status !== "connected") return false
  return new Date(integration.nextSync) <= new Date()
}

export function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "Never"
  const diff = Date.now() - new Date(isoString).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return "Just now"
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function formatNextSync(isoString: string | null): string {
  if (!isoString) return "—"
  const diff = new Date(isoString).getTime() - Date.now()
  if (diff <= 0) return "Overdue"
  const mins = Math.ceil(diff / 60000)
  if (mins < 60) return `in ${mins}m`
  return `in ${Math.floor(mins / 60)}h ${mins % 60}m`
}

// ── Simulated sync leads added ────────────────────────────────────────────
export function simulateSyncLeads(): number {
  return Math.floor(Math.random() * 6) + 1
}
