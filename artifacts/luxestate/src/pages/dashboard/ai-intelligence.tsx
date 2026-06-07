import { useState } from "react"
import { Brain, CreditCard, Zap, MessageSquare, TrendingUp, Star, BarChart2, Clock, AlertCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// ── Shared "Coming soon" feature card ────────────────────────────────────────
function FeatureCard({ icon: Icon, title, description, badge }: {
  icon: React.ElementType; title: string; description: string; badge?: string
}) {
  return (
    <div className="flex gap-3.5 rounded-xl border border-border/60 bg-card p-4 hover:border-border transition-colors">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4.5 w-4.5 text-primary" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {badge && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{badge}</Badge>}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

// ── Coming soon banner ────────────────────────────────────────────────────────
function ComingSoonBanner({ icon: Icon, title, subtitle }: {
  icon: React.ElementType; title: string; subtitle: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 py-14 text-center mb-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
        <Icon className="h-7 w-7 text-primary/70" />
      </div>
      <p className="text-lg font-semibold text-foreground mb-1">{title}</p>
      <p className="text-sm text-muted-foreground max-w-md">{subtitle}</p>
      <Badge className="mt-3 bg-primary/10 text-primary border-primary/20 text-xs font-semibold">Coming Soon</Badge>
    </div>
  )
}

// ── Stat placeholder card ─────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  )
}

// ── AI Intelligence tab ───────────────────────────────────────────────────────
function AIIntelligenceTab() {
  return (
    <div className="space-y-6">
      <ComingSoonBanner
        icon={Brain}
        title="GPT-4o Powered Intelligence"
        subtitle="AI lead scoring, urgency detection, pipeline insights, and a live AI assistant that knows your entire CRM — launching soon."
      />

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Planned Features</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FeatureCard
            icon={Star}
            title="Lead Scoring"
            description="Automated 0–100 lead scores with urgency signals and closing probability — updated in real time."
            badge="GPT-4o"
          />
          <FeatureCard
            icon={Zap}
            title="Bulk AI Analysis"
            description="One-click analysis across all leads in your pipeline — surfaces hot prospects instantly."
          />
          <FeatureCard
            icon={MessageSquare}
            title="AI Chat Assistant"
            description="Live assistant with full CRM context — ask about any lead, deal, or property in plain language."
            badge="GPT-4o"
          />
          <FeatureCard
            icon={TrendingUp}
            title="Pipeline Health & Forecast"
            description="Sales pipeline health score plus revenue forecast based on your historical conversion rates."
          />
          <FeatureCard
            icon={AlertCircle}
            title="Smart Follow-up Reminders"
            description="AI-suggested next-best-action for each lead so no opportunity falls through the cracks."
          />
          <FeatureCard
            icon={BarChart2}
            title="Sentiment Analysis"
            description="Conversation sentiment scoring and relationship health tracking across all your contacts."
          />
        </div>
      </div>
    </div>
  )
}

// ── AI Usage tab ──────────────────────────────────────────────────────────────
function AIUsageTab() {
  const usagePlaceholders = [
    { label: "Tokens Used (This Month)", value: "—", sub: "Tracking starts when AI features launch", color: "text-foreground" },
    { label: "Estimated Cost (USD)", value: "—", sub: "Based on GPT-4o Mini pricing", color: "text-foreground" },
    { label: "AI Operations Run", value: "—", sub: "Lead analysis, chat, insights", color: "text-foreground" },
    { label: "Avg. Cost per Lead", value: "—", sub: "Input + output tokens combined", color: "text-foreground" },
  ]

  return (
    <div className="space-y-6">
      <ComingSoonBanner
        icon={CreditCard}
        title="AI Usage & Billing"
        subtitle="Track every AI API call, monitor token consumption, and view estimated costs — all in one place."
      />

      {/* Placeholder stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {usagePlaceholders.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">What You'll Track</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FeatureCard
            icon={BarChart2}
            title="Token Usage Per Feature"
            description="See exactly how many input and output tokens each AI operation consumes."
          />
          <FeatureCard
            icon={TrendingUp}
            title="Daily & Monthly Charts"
            description="Usage trends over time so you can plan and optimise your AI spend."
          />
          <FeatureCard
            icon={CreditCard}
            title="Cost Breakdown"
            description="Estimated cost split by operation type — lead analysis, chat, bulk insights."
          />
          <FeatureCard
            icon={AlertCircle}
            title="Cost Alerts"
            description="Set a monthly budget threshold and get notified before you exceed it."
          />
          <FeatureCard
            icon={Clock}
            title="GPT-4o Mini Pricing Reference"
            description="Live pricing reference so you always know the per-token cost for every model used."
          />
          <FeatureCard
            icon={Zap}
            title="Operation Log"
            description="A full audit log of every AI call — timestamp, type, tokens, and cost."
          />
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AIIntelligencePage() {
  const [tab, setTab] = useState("intelligence")

  return (
    <div className="space-y-5">
      <DashboardPageHeader
        title="AI Intelligence"
        description="GPT-4o powered insights, lead scoring, and usage monitoring — all in one place."
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-2">
          <TabsTrigger value="intelligence" className="flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5" /> Intelligence
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5" /> Usage & Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="intelligence" className="mt-0">
          <AIIntelligenceTab />
        </TabsContent>
        <TabsContent value="usage" className="mt-0">
          <AIUsageTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
