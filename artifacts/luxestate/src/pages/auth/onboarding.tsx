import { useState, useEffect, useRef } from "react"
import { useLocation } from "wouter"
import { useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useTheme } from "next-themes"
import { supabase } from "@/lib/supabase"
import {
  ArrowRight, ArrowLeft, Check, Loader2, Camera,
  Building2, User, Bell, Wifi, CheckCircle2, Zap, Crown, Star,
} from "lucide-react"
import { THEMES } from "@/lib/themes"

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "")

const TOTAL_STEPS = 7

const ONBOARDING_PLANS = [
  {
    id: "free",
    name: "Free",
    price: "Rs. 0",
    period: "forever",
    description: "Get started with the basics",
    icon: Star,
    color: "text-muted-foreground",
    features: ["Dashboard", "Leads (50)", "Properties", "Dealers", "Calendar", "1 User"],
    locked: ["WhatsApp", "Analytics", "Documents", "AI Features"],
  },
  {
    id: "starter",
    name: "Starter",
    price: "Rs. 4,999",
    period: "/month",
    description: "For solo agents growing their business",
    icon: Zap,
    color: "text-blue-500",
    features: ["500 Leads", "WhatsApp Integration", "Facebook Lead Ads", "Analytics", "Documents"],
    locked: ["Team Management", "AI Features", "Automations"],
  },
  {
    id: "professional",
    name: "Professional",
    price: "Rs. 9,999",
    period: "/month",
    description: "For teams that need more power",
    icon: Crown,
    color: "text-primary",
    popular: true,
    features: ["5,000 Leads", "Team Management", "AI Summaries", "AI Reply Suggestions", "Deals Pipeline"],
    locked: ["AI Chatbot", "Automations", "Workflow Builder"],
  },
  {
    id: "agency",
    name: "Agency",
    price: "Rs. 24,999",
    period: "/month",
    description: "Full AI & automation suite",
    icon: Crown,
    color: "text-amber-500",
    features: ["Unlimited Leads", "Full AI Intelligence", "Automations", "Workflow Builder", "AI Chatbot"],
    locked: [],
  },
]

const ROLES = [
  { value: "admin",  label: "Admin",  description: "Full access — manage team, settings and all data" },
  { value: "agent",  label: "Agent",  description: "Manage your own leads, deals and properties" },
  { value: "viewer", label: "Viewer", description: "Read-only access to view CRM data" },
]

const EMPLOYEE_COUNTS = ["Just me", "2–5", "6–15", "16–50", "51–200", "200+"]

const TITLES = [
  "Senior Agent", "Listing Agent", "Buyer's Agent", "Property Specialist",
  "Team Lead", "Broker", "Managing Director", "Associate", "Other",
]

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function uploadImage(base64: string, filename: string, field: "avatar" | "logo", token: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/api/settings/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ field, base64, filename }),
    })
    if (!res.ok) return null
    const data = await res.json() as { url: string }
    return data.url
  } catch { return null }
}

// ─── Step components ──────────────────────────────────────

function StepProfile({ form, update }: { form: any; update: (k: string, v: string) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Welcome! Let's set up your profile</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">Tell us a bit about yourself</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>First name *</Label>
          <Input value={form.firstName} onChange={(e) => update("firstName", e.target.value)} placeholder="James" />
        </div>
        <div className="space-y-1.5">
          <Label>Last name *</Label>
          <Input value={form.lastName} onChange={(e) => update("lastName", e.target.value)} placeholder="Donovan" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Phone number</Label>
        <Input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+1 (555) 000-0000" />
      </div>
      <div className="space-y-2">
        <Label>Professional title</Label>
        <div className="flex flex-wrap gap-2">
          {TITLES.map((t) => (
            <button key={t} type="button" onClick={() => update("title", t)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                form.title === t
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >{t}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

function StepBusiness({ form, update }: { form: any; update: (k: string, v: string) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Your business</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">Help us personalize your CRM experience</p>
      </div>
      <div className="space-y-1.5">
        <Label>Business / Agency name *</Label>
        <Input value={form.businessName} onChange={(e) => update("businessName", e.target.value)} placeholder="My Real Estate Agency" />
      </div>
      <div className="space-y-1.5">
        <Label>Office address</Label>
        <Input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="123 Beverly Dr, Beverly Hills, CA 90210" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Business phone</Label>
          <Input type="tel" value={form.businessPhone} onChange={(e) => update("businessPhone", e.target.value)} placeholder="+1 (888) 555-0100" />
        </div>
        <div className="space-y-1.5">
          <Label>Team size</Label>
          <select
            value={form.employees}
            onChange={(e) => update("employees", e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
          >
            {EMPLOYEE_COUNTS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Your role</Label>
        <div className="space-y-2">
          {ROLES.map((r) => (
            <button key={r.value} type="button" onClick={() => update("role", r.value)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                form.role === r.value
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/40 hover:bg-muted/20"
              )}
            >
              <div className={cn("mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                form.role === r.value ? "border-primary bg-primary" : "border-muted-foreground"
              )}>
                {form.role === r.value && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function StepPhoto({
  label, field, preview, onPreview,
  title, subtitle,
  shape = "circle",
}: {
  label: string; field: "avatar" | "logo";
  preview: string | null; onPreview: (url: string | null, file: File | null) => void;
  title: string; subtitle: string; shape?: "circle" | "rect";
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = async (file: File) => {
    if (file.size > 4 * 1024 * 1024) { alert("Max file size is 4 MB"); return }
    const url = URL.createObjectURL(file)
    onPreview(url, file)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="flex flex-col items-center gap-5 py-4">
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          className={cn(
            "relative cursor-pointer overflow-hidden border-2 border-dashed transition-all hover:border-primary/60",
            shape === "circle" ? "h-32 w-32 rounded-full" : "h-28 w-48 rounded-2xl",
            dragOver ? "border-primary bg-primary/10" : "border-border bg-secondary/20",
            preview && "border-solid border-primary/40"
          )}
        >
          {preview ? (
            <img src={preview} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <Camera className="h-8 w-8" />
              <span className="text-xs text-center px-2">Click or drag to upload</span>
            </div>
          )}
          {preview && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
              <Camera className="h-6 w-6 text-white" />
            </div>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = "" }}
        />
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <Camera className="mr-2 h-3.5 w-3.5" /> Choose Image
          </Button>
          {preview && (
            <Button variant="ghost" size="sm" className="text-muted-foreground"
              onClick={() => onPreview(null, null)}
            >
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">JPG, PNG or WebP · max 4 MB</p>
      </div>
    </div>
  )
}

function StepTheme({ selectedTheme, onSelect }: { selectedTheme: string; onSelect: (id: string) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Choose your theme</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">Pick a look that fits your brand — you can change it anytime in Settings</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {THEMES.map((t) => (
          <button key={t.id} type="button" onClick={() => onSelect(t.id)}
            className={cn(
              "flex items-center gap-4 rounded-xl border p-3.5 text-left transition-all",
              selectedTheme === t.id
                ? "border-primary bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/20"
                : "border-border hover:border-primary/40 hover:bg-muted/20"
            )}
          >
            <div className="flex flex-shrink-0 -space-x-1.5">
              {t.swatches.map((color, i) => (
                <div key={i} className="h-8 w-8 rounded-full border-2 border-white shadow-sm" style={{ background: color, zIndex: 3 - i }} />
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.description}</p>
            </div>
            {selectedTheme === t.id && (
              <div className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function StepPreferences({ notifs, setNotifs, whatsapp, setWhatsapp }: {
  notifs: Record<string, boolean>; setNotifs: (v: Record<string, boolean>) => void;
  whatsapp: boolean; setWhatsapp: (v: boolean) => void;
}) {
  const toggle = (key: string) => setNotifs({ ...notifs, [key]: !notifs[key] })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Your preferences</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">Set up notifications and integrations</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Notifications</p>
        </div>
        {[
          { key: "newLeads",     label: "New lead assigned",     desc: "Instant alerts when a lead is assigned to you" },
          { key: "dealUpdates",  label: "Deal status changes",   desc: "When deals move through the pipeline" },
          { key: "weeklyReport", label: "Weekly performance",    desc: "Summary of your leads, deals, and activities" },
        ].map((n) => (
          <div key={n.key}
            className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-secondary/10 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{n.label}</p>
              <p className="text-xs text-muted-foreground">{n.desc}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notifs[n.key]}
              onClick={() => toggle(n.key)}
              className={cn(
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                notifs[n.key] ? "bg-primary" : "bg-input"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out",
                  notifs[n.key] ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        ))}
      </div>

    </div>
  )
}

function StepPlan({ selectedPlan, onSelect }: { selectedPlan: string; onSelect: (id: string) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Choose your plan</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">Start free, upgrade anytime — no credit card required</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ONBOARDING_PLANS.map((plan) => {
          const Icon = plan.icon
          const isSelected = selectedPlan === plan.id
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onSelect(plan.id)}
              className={cn(
                "relative flex flex-col gap-3 rounded-xl border p-4 text-left transition-all",
                isSelected
                  ? "border-primary bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/20"
                  : "border-border hover:border-primary/40 hover:bg-muted/20",
              )}
            >
              {plan.popular && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", plan.color)} />
                  <span className="text-sm font-semibold text-foreground">{plan.name}</span>
                </div>
                <div className={cn("flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors",
                  isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                )}>
                  {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">{plan.price}</span>
                <span className="ml-1 text-xs text-muted-foreground">{plan.period}</span>
              </div>
              <p className="text-xs text-muted-foreground">{plan.description}</p>
              <ul className="space-y-1">
                {plan.features.slice(0, 3).map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-foreground">
                    <Check className="h-3 w-3 text-primary flex-shrink-0" />{f}
                  </li>
                ))}
                {plan.features.length > 3 && (
                  <li className="text-xs text-muted-foreground pl-4.5">+{plan.features.length - 3} more</li>
                )}
              </ul>
            </button>
          )
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground">You can change your plan anytime from Billing settings</p>
    </div>
  )
}

function LoadingStep() {
  const steps = [
    "Setting up your profile…",
    "Applying your theme…",
    "Configuring notifications…",
    "Preparing your dashboard…",
    "You're all set! ✓",
  ]
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      i++
      if (i >= steps.length) { clearInterval(interval); return }
      setActiveIdx(i)
    }, 550)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center gap-8 py-6">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-xl shadow-primary/30"
      >
        <span className="text-3xl font-bold text-primary-foreground">L</span>
      </motion.div>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Customizing your CRM</h2>
        <p className="mt-1 text-sm text-muted-foreground">Just a moment…</p>
      </div>
      <div className="w-full max-w-xs space-y-2.5">
        {steps.map((step, i) => (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: i <= activeIdx ? 1 : 0.3, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3"
          >
            <div className={cn(
              "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-colors",
              i < activeIdx ? "bg-primary" : i === activeIdx ? "bg-primary/60" : "bg-border"
            )}>
              {i < activeIdx
                ? <Check className="h-3 w-3 text-primary-foreground" />
                : i === activeIdx
                  ? <Loader2 className="h-3 w-3 text-white animate-spin" />
                  : null
              }
            </div>
            <p className={cn("text-sm transition-colors", i <= activeIdx ? "text-foreground font-medium" : "text-muted-foreground")}>
              {step}
            </p>
          </motion.div>
        ))}
      </div>
      <div className="w-full max-w-xs h-1.5 rounded-full bg-secondary overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: "0%" }}
          animate={{ width: `${((activeIdx + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user, loading } = useAuth()
  const [, setLocation] = useLocation()
  const { setTheme } = useTheme()
  const queryClient = useQueryClient()

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", title: "Agent",
    businessName: "", address: "", businessPhone: "", employees: "Just me",
    role: "agent",
  })

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile]       = useState<File | null>(null)
  const [logoPreview, setLogoPreview]     = useState<string | null>(null)
  const [logoFile, setLogoFile]           = useState<File | null>(null)
  const [selectedTheme, setSelectedTheme] = useState("gold")
  const [selectedPlan, setSelectedPlan]   = useState("free")
  const [notifs, setNotifs] = useState({ newLeads: true, dealUpdates: true, weeklyReport: true })

  useEffect(() => {
    if (!loading && !user) setLocation("/sign-in")
  }, [user, loading, setLocation])

  // Pre-fill from Supabase user metadata
  useEffect(() => {
    if (user?.user_metadata) {
      const m = user.user_metadata
      const fullName = (m.full_name || m.name || "") as string
      const parts = fullName.split(" ")
      setForm((f) => ({
        ...f,
        firstName: m.given_name || parts[0] || "",
        lastName:  m.family_name || parts.slice(1).join(" ") || "",
      }))
      if (m.avatar_url) setAvatarPreview(m.avatar_url as string)
    }
  }, [user])

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  const handleThemeSelect = (id: string) => {
    setSelectedTheme(id)
    setTheme(id)
  }

  const canProceed = () => {
    if (step === 1) return form.firstName.trim() && form.lastName.trim() && form.phone.trim() && form.title.trim()
    if (step === 2) return form.businessName.trim() && form.address.trim() && form.businessPhone.trim() && form.role.trim()
    return true
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError("")
    setStep(8) // show loading

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("No session")
      const token = session.access_token

      // Upload images if provided
      let avatarUrl: string | null = null
      let logoUrl: string | null = null

      if (avatarFile) {
        const b64 = await fileToBase64(avatarFile)
        avatarUrl = await uploadImage(b64, avatarFile.name, "avatar", token)
      }
      if (logoFile) {
        const b64 = await fileToBase64(logoFile)
        logoUrl = await uploadImage(b64, logoFile.name, "logo", token)
      }

      // Save user profile — throw immediately if this fails so onboarded:true
      // is never silently skipped (which would cause an infinite onboarding loop)
      const userRes = await fetch(`${BASE}/api/users/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email: user?.email || "",
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          title: form.title,
          avatarUrl: avatarUrl || user?.user_metadata?.avatar_url || null,
          onboarded: true,
        }),
      })
      if (!userRes.ok) {
        const errBody = await userRes.json().catch(() => ({}))
        throw new Error((errBody as any)?.error ?? `Failed to save profile (${userRes.status})`)
      }

      // Save settings
      await fetch(`${BASE}/api/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          businessName:          form.businessName || null,
          businessLogoUrl:       logoUrl || null,
          whatsappNumber:        form.businessPhone || null,
          officeAddress:         form.address || null,
          teamSize:              form.employees || null,
          position:              form.title || null,
          theme:                 selectedTheme,
          notificationsEnabled:  notifs.newLeads || notifs.dealUpdates,
          newLeadNotif:          notifs.newLeads,
          dealStatusNotif:       notifs.dealUpdates,
          weeklyReportsEnabled:  notifs.weeklyReport,
          marketingEmailsEnabled:false,
        }),
      })

      // Let loading screen play for a moment
      await new Promise((r) => setTimeout(r, 2800))

      // Invalidate the cached user profile so OnboardingGuard sees onboarded=true
      // Must use exact:false (default) so ["currentUser", userId] is also cleared
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      await queryClient.refetchQueries({ queryKey: ["currentUser"], exact: false })

      setLocation("/dashboard")
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.")
      setStep(7)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const progress = step === 8 ? 100 : Math.round((step / TOTAL_STEPS) * 100)

  return (
    <div className="flex min-h-[100dvh] bg-gradient-to-br from-background via-background to-primary/5">
      <div className="flex w-full flex-col items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg"
        >
          {/* Logo */}
          <div className="mb-6 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-md shadow-primary/25">
              <span className="text-base font-bold text-primary-foreground">L</span>
            </div>
            <span className="text-xl font-semibold tracking-tight">
              Luxe<span className="text-primary">State</span>
            </span>
          </div>

          {/* Progress bar */}
          {step < 8 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Step {step} of {TOTAL_STEPS}</span>
                <span className="text-xs font-medium text-primary">{progress}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              {/* Step dots */}
              <div className="mt-3 flex justify-between px-0.5">
                {[1,2,3,4,5,6,7].map((s) => (
                  <div key={s} className={cn(
                    "h-1.5 flex-1 mx-0.5 rounded-full transition-colors",
                    s < step ? "bg-primary" : s === step ? "bg-primary/60" : "bg-secondary"
                  )} />
                ))}
              </div>
            </div>
          )}

          {/* Card */}
          <div className="rounded-2xl bg-card border border-border/50 p-6 shadow-xl shadow-black/5">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22 }}
              >
                {step === 1 && <StepProfile form={form} update={update} />}
                {step === 2 && <StepBusiness form={form} update={update} />}
                {step === 3 && (
                  <StepPhoto
                    label="Profile photo"
                    field="avatar"
                    title="Add a profile photo"
                    subtitle="Help your team recognize you — or skip and add it later in Settings"
                    shape="circle"
                    preview={avatarPreview}
                    onPreview={(url, file) => { setAvatarPreview(url); setAvatarFile(file) }}
                  />
                )}
                {step === 4 && (
                  <StepPhoto
                    label="Business logo"
                    field="logo"
                    title="Upload your business logo"
                    subtitle="Used in reports, documents and your client-facing materials"
                    shape="rect"
                    preview={logoPreview}
                    onPreview={(url, file) => { setLogoPreview(url); setLogoFile(file) }}
                  />
                )}
                {step === 5 && <StepTheme selectedTheme={selectedTheme} onSelect={handleThemeSelect} />}
                {step === 6 && <StepPlan selectedPlan={selectedPlan} onSelect={setSelectedPlan} />}
                {step === 7 && (
                  <StepPreferences
                    notifs={notifs} setNotifs={setNotifs}
                    whatsapp={false} setWhatsapp={() => {}}
                  />
                )}
                {step === 8 && <LoadingStep />}
              </motion.div>
            </AnimatePresence>

            {/* Error */}
            {error && (
              <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            {/* Navigation */}
            {step < 8 && (
              <div className="mt-6 flex gap-3">
                {step > 1 && (
                  <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)} disabled={submitting}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                )}
                {step < 7 ? (
                  <Button
                    className="flex-1 gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                    onClick={() => setStep(step + 1)}
                    disabled={!canProceed()}
                  >
                    {step === 1 ? "Next" : "Continue"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    className="flex-1 gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Setting up…</>
                      : <><CheckCircle2 className="h-4 w-4" /> Launch my CRM</>
                    }
                  </Button>
                )}
              </div>
            )}

            {/* Skip links for optional steps */}
            {(step === 3 || step === 4) && (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip for now
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
