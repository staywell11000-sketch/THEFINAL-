import { useState } from "react"
import {
  Zap, GitBranch, MessageSquare, UserCheck, Bell, Play, Plus, Clock, ChevronRight,
  Activity, Mail, Users, RotateCcw, Calendar, Target, Trash2, GripVertical,
  ChevronDown, ChevronUp, Sparkles,
} from "lucide-react"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

// ── Data ──────────────────────────────────────────────────────────────────────
const TEMPLATE_AUTOMATIONS = [
  {
    id: 1,
    name: "Lead Assignment",
    trigger: "New Lead Created",
    actions: ["Assign Agent", "Notify Agent via WhatsApp"],
    icon: UserCheck,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    description: "Automatically assign every new lead to an agent and notify them instantly via WhatsApp.",
  },
  {
    id: 2,
    name: "WhatsApp Welcome Message",
    trigger: "New Facebook / Instagram Lead",
    actions: ["Send Approved WhatsApp Template"],
    icon: MessageSquare,
    color: "text-green-500",
    bg: "bg-green-500/10",
    description: "Send a personalised WhatsApp welcome message the moment a Facebook or Instagram lead comes in.",
  },
  {
    id: 3,
    name: "Follow-Up Workflow",
    trigger: "No Response After 24 Hours",
    actions: ["Generate AI Follow-Up", "Send WhatsApp Message", "Create Task", "Notify Agent"],
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    description: "If a lead doesn't respond in 24 hours, trigger an AI-generated follow-up and create a task for the agent.",
    variants: ["24 hours", "3 days", "Site Visit Scheduled", "Deal Stage Changed"],
  },
  {
    id: 4,
    name: "Appointment Reminder",
    trigger: "Appointment Upcoming (24 hours before)",
    actions: ["WhatsApp Reminder", "Email Reminder", "CRM Notification"],
    icon: Calendar,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    description: "Remind leads and agents about upcoming appointments via WhatsApp, email, and CRM notifications.",
    variants: ["1 hour before", "24 hours before"],
  },
  {
    id: 5,
    name: "Auto-assign Hot Leads",
    trigger: "Lead Score ≥ 80",
    actions: ["Assign to Top Agent", "Notify via WhatsApp"],
    icon: Zap,
    color: "text-primary",
    bg: "bg-primary/10",
    description: "When AI scores a lead ≥ 80, auto-assign to the top-performing agent and send a priority WhatsApp alert.",
  },
  {
    id: 6,
    name: "Re-Engagement Campaign",
    trigger: "Lead Inactive for 14 Days",
    actions: ["WhatsApp Follow-Up", "Email Follow-Up", "Create Task"],
    icon: RotateCcw,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    description: "Re-engage leads that have gone quiet with a multi-channel follow-up sequence.",
    variants: ["7 days", "14 days", "30 days"],
  },
  {
    id: 7,
    name: "Deal Stage Notification",
    trigger: "Deal Moves to Negotiation",
    actions: ["Notify Manager", "Create Follow-Up Task"],
    icon: Bell,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    description: "Alert the manager and create follow-up tasks whenever a deal enters a critical stage.",
    variants: ["Negotiation", "Contract Sent", "Closed Won", "Closed Lost"],
  },
]

const CAMPAIGN_SEQUENCES = [
  {
    id: "buyer",
    name: "Buyer Sequence",
    icon: Target,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    steps: [
      { day: 0, action: "WhatsApp Welcome", message: "Personalised welcome + property overview" },
      { day: 1, action: "WhatsApp Follow-Up", message: "Ask about budget and requirements" },
      { day: 3, action: "WhatsApp Message", message: "Share 2-3 matching property listings" },
      { day: 7, action: "WhatsApp + Email", message: "Site visit invitation" },
      { day: 14, action: "WhatsApp Message", message: "Re-engagement with new properties" },
    ],
  },
  {
    id: "investor",
    name: "Investor Sequence",
    icon: Activity,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    steps: [
      { day: 0, action: "WhatsApp Welcome", message: "Investment property introduction" },
      { day: 2, action: "Email", message: "ROI analysis and property comparison PDF" },
      { day: 5, action: "WhatsApp Message", message: "Market insights and growth projections" },
      { day: 10, action: "WhatsApp + Task", message: "Schedule investment consultation" },
    ],
  },
  {
    id: "new-lead",
    name: "New Lead Sequence",
    icon: Sparkles,
    color: "text-green-500",
    bg: "bg-green-500/10",
    steps: [
      { day: 0, action: "WhatsApp Welcome", message: "Instant welcome + team intro" },
      { day: 1, action: "WhatsApp Message", message: "Qualify: budget, area, property type" },
      { day: 3, action: "Task Created", message: "Call lead — agent notified" },
      { day: 7, action: "WhatsApp Message", message: "Share top properties + CTA" },
    ],
  },
]

// ── TRIGGERS / CONDITIONS / ACTIONS for builder ────────────────────────────────
const TRIGGERS = [
  "New Lead Created",
  "Lead Imported from Facebook",
  "Lead Imported from Instagram",
  "Lead Score Updated",
  "Lead Score ≥ 70",
  "Lead Score ≥ 80",
  "Lead Inactive for 24 Hours",
  "Lead Inactive for 3 Days",
  "Lead Inactive for 7 Days",
  "Deal Created",
  "Deal Stage Changed",
  "Deal Moved to Negotiation",
  "Appointment Scheduled",
  "Appointment in 1 Hour",
  "Appointment in 24 Hours",
]

const CONDITION_FIELDS = ["Lead Source", "Lead Score", "Lead Status", "Deal Stage", "Deal Value", "Property Type", "Budget"]
const CONDITION_OPS = ["equals", "is greater than", "is less than", "contains", "is not"]
const ACTIONS_LIST = [
  "Send WhatsApp Message",
  "Send WhatsApp Template",
  "Send Email",
  "Create Task",
  "Assign Agent",
  "Notify Agent via WhatsApp",
  "Notify Manager",
  "Update Lead Status",
  "Generate AI Follow-Up",
  "Add Tag to Lead",
  "Move Deal to Stage",
]

// ── Automation Card ───────────────────────────────────────────────────────────
function AutomationCard({ automation }: { automation: typeof TEMPLATE_AUTOMATIONS[0] }) {
  const [active, setActive] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const Icon = automation.icon

  return (
    <div className={cn(
      "rounded-xl border transition-all duration-200",
      active ? "border-primary/30 bg-primary/5" : "border-border/60 bg-card"
    )}>
      <div className="flex items-start gap-3 p-4">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg mt-0.5", automation.bg)}>
          <Icon className={cn("h-4 w-4", automation.color)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{automation.name}</p>
              {active && <Badge variant="outline" className="text-[10px] text-green-600 border-green-300 bg-green-50 dark:bg-green-950/20">Active</Badge>}
            </div>
            <button
              onClick={() => setActive(v => !v)}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                active ? "bg-primary" : "bg-muted-foreground/30"
              )}
            >
              <span className={cn("inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform", active ? "translate-x-4" : "translate-x-0.5")} />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-2">{automation.description}</p>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-foreground/70">⚡ {automation.trigger}</span>
            <ChevronRight className="h-3 w-3 opacity-40" />
            {automation.actions.map(a => (
              <span key={a} className="rounded-md bg-muted px-2 py-0.5">{a}</span>
            ))}
          </div>
        </div>
      </div>

      {active && (
        <div className="border-t border-border/40 px-4 py-3 flex items-center gap-3">
          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">0 runs · Ready to trigger</span>
          <div className="ml-auto flex gap-2">
            {(automation as any).variants && (
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setExpanded(v => !v)}>
                Variants {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5">
              <Play className="h-3 w-3" /> Test
            </Button>
          </div>
        </div>
      )}

      {active && expanded && (automation as any).variants && (
        <div className="border-t border-border/40 px-4 pb-4 pt-3">
          <p className="text-xs text-muted-foreground mb-2">Trigger variants — toggle to enable additional triggers:</p>
          <div className="flex flex-wrap gap-2">
            {(automation as any).variants.map((v: string) => (
              <button key={v} className="rounded-md border border-border/50 bg-muted/40 px-2.5 py-1 text-xs hover:bg-muted transition-colors">
                {v}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Campaign Sequence ─────────────────────────────────────────────────────────
function CampaignCard({ seq }: { seq: typeof CAMPAIGN_SEQUENCES[0] }) {
  const [expanded, setExpanded] = useState(false)
  const [active, setActive] = useState(false)
  const Icon = seq.icon

  return (
    <div className={cn("rounded-xl border transition-all", active ? "border-primary/30 bg-primary/5" : "border-border/60 bg-card")}>
      <div className="flex items-center gap-3 p-4">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", seq.bg)}>
          <Icon className={cn("h-4 w-4", seq.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{seq.name}</p>
            <Badge variant="outline" className="text-[10px] px-1.5">{seq.steps.length} steps</Badge>
            {active && <Badge variant="outline" className="text-[10px] text-green-600 border-green-300 bg-green-50 dark:bg-green-950/20">Active</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">Automated {seq.steps.length}-step sequence over {seq.steps[seq.steps.length - 1].day} days</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setExpanded(v => !v)}>
            {expanded ? "Hide" : "Preview"}
          </Button>
          <button
            onClick={() => setActive(v => !v)}
            className={cn("relative inline-flex h-5 w-9 items-center rounded-full transition-colors", active ? "bg-primary" : "bg-muted-foreground/30")}
          >
            <span className={cn("inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform", active ? "translate-x-4" : "translate-x-0.5")} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/40 px-4 pb-4 pt-3">
          <div className="relative space-y-0">
            {seq.steps.map((step, i) => (
              <div key={i} className="flex gap-3 pb-3 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted border border-border/60 text-xs font-bold text-muted-foreground">
                    {step.day === 0 ? "Now" : `D${step.day}`}
                  </div>
                  {i < seq.steps.length - 1 && <div className="w-px flex-1 bg-border/40 mt-1" />}
                </div>
                <div className="pt-0.5 pb-3 min-w-0">
                  <p className="text-xs font-medium text-foreground">{step.action}</p>
                  <p className="text-xs text-muted-foreground">{step.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Visual Workflow Builder ───────────────────────────────────────────────────
interface WorkflowCondition { field: string; op: string; value: string }
interface WorkflowAction { action: string }

function WorkflowBuilderTab() {
  const [trigger, setTrigger] = useState("")
  const [conditions, setConditions] = useState<WorkflowCondition[]>([])
  const [actions, setActions] = useState<WorkflowAction[]>([{ action: "" }])
  const [saved, setSaved] = useState(false)

  const addCondition = () => setConditions(prev => [...prev, { field: CONDITION_FIELDS[0], op: "equals", value: "" }])
  const removeCondition = (i: number) => setConditions(prev => prev.filter((_, idx) => idx !== i))
  const updateCondition = (i: number, key: keyof WorkflowCondition, value: string) =>
    setConditions(prev => prev.map((c, idx) => idx === i ? { ...c, [key]: value } : c))

  const addAction = () => setActions(prev => [...prev, { action: "" }])
  const removeAction = (i: number) => setActions(prev => prev.filter((_, idx) => idx !== i))
  const updateAction = (i: number, value: string) => setActions(prev => prev.map((a, idx) => idx === i ? { action: value } : a))

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/40 bg-muted/30 flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Visual Workflow Builder</p>
          <Badge variant="outline" className="text-[10px] px-1.5 ml-auto">Agency</Badge>
        </div>

        <div className="p-5 space-y-5">
          {/* Trigger */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">1</div>
              <p className="text-sm font-semibold text-foreground">TRIGGER — When this happens</p>
            </div>
            <div className="ml-8">
              <Select value={trigger} onValueChange={setTrigger}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select a trigger event…" />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conditions */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold shrink-0">2</div>
              <p className="text-sm font-semibold text-foreground">IF — Conditions (optional)</p>
              <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs gap-1" onClick={addCondition}>
                <Plus className="h-3 w-3" /> Add Condition
              </Button>
            </div>
            <div className="ml-8 space-y-2">
              {conditions.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No conditions — workflow runs for every trigger event.</p>
              )}
              {conditions.map((c, i) => (
                <div key={i} className="flex items-center gap-2 flex-wrap">
                  {i > 0 && <span className="text-xs font-medium text-muted-foreground w-8">AND</span>}
                  <Select value={c.field} onValueChange={v => updateCondition(i, "field", v)}>
                    <SelectTrigger className="h-8 text-xs w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITION_FIELDS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={c.op} onValueChange={v => updateCondition(i, "op", v)}>
                    <SelectTrigger className="h-8 text-xs w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITION_OPS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <input
                    className="h-8 flex-1 min-w-[80px] rounded-md border border-input bg-background px-3 text-xs"
                    placeholder="Value…"
                    value={c.value}
                    onChange={e => updateCondition(i, "value", e.target.value)}
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeCondition(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white text-[10px] font-bold shrink-0">3</div>
              <p className="text-sm font-semibold text-foreground">THEN — Actions to perform</p>
              <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs gap-1" onClick={addAction}>
                <Plus className="h-3 w-3" /> Add Action
              </Button>
            </div>
            <div className="ml-8 space-y-2">
              {actions.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground shrink-0">
                    {i + 1}
                  </div>
                  <Select value={a.action} onValueChange={v => updateAction(i, v)}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="Select an action…" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIONS_LIST.map(act => <SelectItem key={act} value={act}>{act}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {actions.length > 1 && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeAction(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          {trigger && actions.some(a => a.action) && (
            <div className="ml-0 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 space-y-1.5">
              <p className="text-xs font-semibold text-primary">Workflow Preview</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">When:</span> {trigger}
              </p>
              {conditions.filter(c => c.value).map((c, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{i === 0 ? "If:" : "And:"}</span> {c.field} {c.op} "{c.value}"
                </p>
              ))}
              {actions.filter(a => a.action).map((a, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Then ({i + 1}):</span> {a.action}
                </p>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => { setTrigger(""); setConditions([]); setActions([{ action: "" }]) }}>
              Clear
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!trigger || !actions.some(a => a.action)} className="gap-1.5">
              {saved ? "✓ Saved" : <><Sparkles className="h-3.5 w-3.5" /> Save Workflow</>}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-border/50 bg-muted/10 p-5 text-center">
        <p className="text-sm text-muted-foreground">Backend execution engine coming in the next release. Saved workflows will activate automatically.</p>
      </div>
    </div>
  )
}

// ── Logs Tab ──────────────────────────────────────────────────────────────────
function LogsTab() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card py-16 text-center gap-3">
      <Activity className="h-8 w-8 text-muted-foreground opacity-40" />
      <p className="text-sm font-medium text-foreground">No automation runs yet</p>
      <p className="text-xs text-muted-foreground max-w-xs">Enable automations above and they'll appear here when they run. Full execution logs include timestamps, lead IDs, and action outcomes.</p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AutomationsPage() {
  const [tab, setTab] = useState("automations")

  return (
    <div className="space-y-5">
      <DashboardPageHeader
        title="Automations"
        description="7 template automations, lead nurturing campaigns, and a visual workflow builder."
        actions={
          <Button size="sm" className="gap-2" onClick={() => setTab("builder")}>
            <Plus className="h-4 w-4" /> New Workflow
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-2">
          <TabsTrigger value="automations" className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Automations
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="builder" className="flex items-center gap-1.5">
            <GitBranch className="h-3.5 w-3.5" /> Builder
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" /> Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="automations" className="mt-0 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Toggle automations on to activate them. All automations require the Agency plan.</p>
            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Agency</Badge>
          </div>
          {TEMPLATE_AUTOMATIONS.map(a => (
            <AutomationCard key={a.id} automation={a} />
          ))}
        </TabsContent>

        <TabsContent value="campaigns" className="mt-0 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Lead Nurturing Campaigns</p>
              <p className="text-xs text-muted-foreground">Automated multi-step sequences for different lead types.</p>
            </div>
            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Agency</Badge>
          </div>
          <div className="space-y-3">
            {CAMPAIGN_SEQUENCES.map(seq => (
              <CampaignCard key={seq.id} seq={seq} />
            ))}
          </div>

          <div className="mt-4">
            <div className="mb-3">
              <p className="text-sm font-semibold">Re-Engagement Campaigns</p>
              <p className="text-xs text-muted-foreground">Target inactive leads with multi-channel follow-up sequences.</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10">
                  <RotateCcw className="h-4 w-4 text-rose-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Inactive Lead Re-engagement</p>
                  <p className="text-xs text-muted-foreground">Target leads with no activity in 7, 14, or 30 days</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {["7 days inactive", "14 days inactive", "30 days inactive"].map(v => (
                  <div key={v} className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{v}</span>
                    <div className="flex items-center gap-1 ml-2">
                      <Mail className="h-3 w-3 text-muted-foreground/60" />
                      <MessageSquare className="h-3 w-3 text-muted-foreground/60" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="builder" className="mt-0">
          <WorkflowBuilderTab />
        </TabsContent>

        <TabsContent value="logs" className="mt-0">
          <LogsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
