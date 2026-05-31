import { useState, useEffect } from "react"
import { useLocation } from "wouter"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, ArrowRight, CheckCircle2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"

const ROLES = [
  { value: "admin", label: "Admin", description: "Full access to all features and team management" },
  { value: "agent", label: "Agent", description: "Manage leads, deals, and properties" },
  { value: "viewer", label: "Viewer", description: "Read-only access to the dashboard" },
]

const TITLES = [
  "Senior Agent",
  "Listing Agent",
  "Buyer's Agent",
  "Luxury Specialist",
  "Team Lead",
  "Broker",
  "Associate",
  "Other",
]

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "")

export default function OnboardingPage() {
  const { user, loading } = useAuth()
  const [, setLocation] = useLocation()

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    role: "agent",
    title: "Agent",
  })

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/sign-in")
    }
  }, [user, loading, setLocation])

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async () => {
    setSubmitting(true)
    setError("")
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("No session")

      const res = await fetch(`${BASE}/api/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: user?.email || "",
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          role: form.role,
          title: form.title,
          avatarUrl: user?.user_metadata?.avatar_url || null,
          onboarded: true,
        }),
      })
      if (!res.ok) throw new Error("Failed to save profile")
      setLocation("/dashboard")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
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

  return (
    <div className="flex min-h-[100dvh] bg-gradient-to-br from-amber-50 via-background to-orange-50">
      <div className="flex w-full flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg"
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/25">
              <span className="text-lg font-bold text-primary-foreground">L</span>
            </div>
            <span className="text-2xl font-semibold tracking-tight">
              Luxe<span className="text-primary">State</span>
            </span>
          </div>

          <div className="mb-2 flex gap-2">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors duration-300",
                  s <= step ? "bg-primary" : "bg-primary/20"
                )}
              />
            ))}
          </div>
          <p className="mb-8 text-xs text-muted-foreground">Step {step} of 2</p>

          <div className="rounded-2xl bg-white p-8 shadow-xl shadow-black/8">
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="mb-1 text-2xl font-semibold text-foreground">
                  Welcome!
                </h1>
                <p className="mb-6 text-sm text-muted-foreground">
                  Let's set up your profile so your team knows who you are.
                </p>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName" className="text-sm font-medium">
                        First name
                      </Label>
                      <Input
                        id="firstName"
                        value={form.firstName}
                        onChange={(e) => update("firstName", e.target.value)}
                        placeholder="James"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName" className="text-sm font-medium">
                        Last name
                      </Label>
                      <Input
                        id="lastName"
                        value={form.lastName}
                        onChange={(e) => update("lastName", e.target.value)}
                        placeholder="Donovan"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Phone number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Professional title</Label>
                    <div className="flex flex-wrap gap-2">
                      {TITLES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => update("title", t)}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                            form.title === t
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Button
                  className="mt-6 w-full"
                  onClick={() => setStep(2)}
                  disabled={!form.firstName.trim() || !form.lastName.trim()}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="mb-1 text-2xl font-semibold text-foreground">
                  Choose your role
                </h1>
                <p className="mb-6 text-sm text-muted-foreground">
                  This determines what you can access in LuxeState.
                </p>

                <div className="space-y-3">
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => update("role", r.value)}
                      className={cn(
                        "flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-all",
                        form.role === r.value
                          ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                          : "border-border bg-background hover:border-primary/40 hover:bg-muted/30"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          form.role === r.value
                            ? "border-primary bg-primary"
                            : "border-border"
                        )}
                      >
                        {form.role === r.value && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          <span className="font-medium text-foreground">{r.label}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{r.description}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {error && (
                  <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <div className="mt-6 flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    {submitting ? "Saving…" : "Complete Setup"}
                  </Button>
                </div>

                <p className="mt-4 text-center text-xs text-muted-foreground">
                  You can change your role later in Settings
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
