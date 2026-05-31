export type LeadStatus = "new" | "qualified" | "proposal" | "negotiation" | "won" | "lost"
export type LeadPriority = "hot" | "warm" | "cold"

/**
 * Canonical ad platform sources (normalized, lowercase).
 * These receive full source tracking (campaign, adSet, adCreativeId).
 * Legacy string values are preserved for backward compatibility.
 */
export type LeadSource =
  | "manual"
  | "facebook"
  | "instagram"
  | "whatsapp"
  | "website"
  | "tiktok"
  // Legacy values — kept for backward compat with existing leads
  | "Website"
  | "Referral"
  | "Social Media"
  | "Email"
  | "Cold Call"
  | "Facebook Ad"
  | "Google Ad"
  | "Instagram Ad"
  | "LinkedIn"

export type Lead = {
  id: number
  name: string
  email: string
  phone: string
  whatsappNumber: string
  interestedProperties: string[]
  property: string
  budget: string
  status: LeadStatus
  priority: LeadPriority
  source: LeadSource
  assignedTo: string
  lastContact: string
  avatar: string
  notes: string[]
  timeline: Array<{ id: string; title: string; time: string }>
  score: number
  urgencyScore: number
  tags: string[]
  reminder?: { date: string; note: string }
  attachments: Array<{ name: string; size: string; type: "pdf" | "doc" | "img" | "other" }>
  duplicateOf?: number
  /** Campaign name — e.g. "Miami Summer 2026" */
  campaign?: string
  /** Ad creative / placement name — e.g. "FB Story — Beachfront" */
  adSource?: string
  /** Ad set name — e.g. "Lookalike 25-45 Miami" */
  adSetName?: string
  /** Ad creative ID from the ad platform */
  adCreativeId?: string
  /** External lead ID from the originating platform (used for deduplication) */
  externalId?: string
  aiSummary?: string
  suggestedActions?: string[]
}
