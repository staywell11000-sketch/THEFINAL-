export type PlanSlug = "free" | "trial" | "starter" | "professional" | "agency"

export const PLAN_DISPLAY: Record<PlanSlug, { name: string; price: number; color: string }> = {
  free:         { name: "Free",         price: 0,     color: "bg-slate-500" },
  trial:        { name: "Free Trial",   price: 0,     color: "bg-slate-400" },
  starter:      { name: "Starter",      price: 9999,  color: "bg-blue-500" },
  professional: { name: "Professional", price: 19999, color: "bg-purple-500" },
  agency:       { name: "Agency",       price: 25000, color: "bg-amber-500" },
}

export const PLAN_ORDER: PlanSlug[] = ["free", "trial", "starter", "professional", "agency"]

export function meetsRequirement(currentPlan: string, requiredPlan: PlanSlug): boolean {
  const ci = PLAN_ORDER.indexOf(currentPlan as PlanSlug)
  const ri = PLAN_ORDER.indexOf(requiredPlan)
  return ci >= ri
}

export interface FeatureConfig {
  name: string
  requiredPlan: PlanSlug
  benefits: string[]
}

export const FEATURE_CONFIG: Record<string, FeatureConfig> = {
  lead_sources: {
    name: "Lead Sources & Integrations",
    requiredPlan: "starter",
    benefits: [
      "Connect WhatsApp, Facebook & Instagram",
      "Auto-import leads from Facebook Lead Ads",
      "Real-time sync with all lead channels",
      "Duplicate detection and smart merging",
    ],
  },
  messages: {
    name: "Messages",
    requiredPlan: "starter",
    benefits: [
      "WhatsApp conversation threads",
      "Template messages & broadcast lists",
      "Lead conversation history",
      "Multi-channel inbox",
    ],
  },
  documents: {
    name: "Documents",
    requiredPlan: "starter",
    benefits: [
      "Upload contracts, agreements & brochures",
      "Attach documents to leads and properties",
      "Secure cloud storage with access controls",
      "Document sharing with clients",
    ],
  },
  analytics: {
    name: "Analytics & Insights",
    requiredPlan: "starter",
    benefits: [
      "Conversion rate trends and forecasts",
      "Lead source performance breakdown",
      "Agent leaderboards and win rates",
      "Export reports as PDF",
    ],
  },
  calculator: {
    name: "Property Calculator",
    requiredPlan: "starter",
    benefits: [
      "EMI and mortgage calculator",
      "ROI projections for investments",
      "Commission breakdown tool",
      "Shareable client reports",
    ],
  },
  team: {
    name: "Team Management",
    requiredPlan: "professional",
    benefits: [
      "Invite unlimited team members",
      "Role-based access control",
      "Lead assignment by rules or manually",
      "Team performance dashboards",
    ],
  },
  deals: {
    name: "Deals Pipeline",
    requiredPlan: "professional",
    benefits: [
      "Visual Kanban deal pipeline",
      "Revenue forecasting by stage",
      "Deal value tracking and history",
      "Win/loss analysis and reports",
    ],
  },
  ai_intelligence: {
    name: "AI Intelligence",
    requiredPlan: "agency",
    benefits: [
      "GPT-4o powered CRM assistant",
      "Automated lead scoring (0–100)",
      "Bulk pipeline analysis in one click",
      "Smart follow-up recommendations",
    ],
  },
  automations: {
    name: "Automations",
    requiredPlan: "agency",
    benefits: [
      "No-code workflow builder",
      "Auto-send WhatsApp on lead events",
      "Automatic lead assignment by rules",
      "Full execution logs and history",
    ],
  },
  advanced_reporting: {
    name: "Advanced Reporting",
    requiredPlan: "agency",
    benefits: [
      "Custom report builder",
      "Multi-agent performance comparison",
      "Revenue attribution by channel",
      "White-label PDF exports",
    ],
  },
}

// Nav item → feature gate mapping
export const NAV_FEATURE_MAP: Record<string, string> = {
  "/dashboard/integrations":    "lead_sources",
  "/dashboard/messages":        "messages",
  "/dashboard/documents":       "documents",
  "/dashboard/analytics":       "analytics",
  "/dashboard/calculator":      "calculator",
  "/dashboard/team":            "team",
  "/dashboard/deals":           "deals",
  "/dashboard/ai-intelligence": "ai_intelligence",
  "/dashboard/automations":     "automations",
}
