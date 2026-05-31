import { useState } from "react"
import {
  Check, ChevronRight, Loader2, CheckCircle2, AlertTriangle,
  ExternalLink, Shield, Hash, FileText, Settings2, X,
} from "lucide-react"
import { FaFacebook, FaInstagram, FaWhatsapp } from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { PLATFORM_CONFIGS, type Platform } from "@/components/dashboard/integrations-data"
import {
  fetchOAuthUrl, usePages, useAdAccounts, useSaveAccountMetadata,
  type ConnectedAccount, type FacebookPage, type AdAccount,
} from "@/lib/connected-accounts-api"
import { agents } from "@/components/dashboard/leads-data"
import { surfaceSelectClass } from "@/lib/ui-classes"
import { useQueryClient } from "@tanstack/react-query"

// ── Platform icon (inline) ────────────────────────────────────────────────
function MetaIcon({ platform, size = "md" }: { platform: Platform; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-5 w-5"
  const cfg = PLATFORM_CONFIGS[platform]
  const Icon = { facebook: FaFacebook, instagram: FaInstagram, whatsapp: FaWhatsapp }[platform as string] ?? FaFacebook
  return (
    <div className={cn(
      "flex shrink-0 items-center justify-center rounded-xl",
      size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-10 w-10",
      `bg-gradient-to-br ${cfg.gradient}`
    )}>
      <Icon className={cn(sz, "text-white")} />
    </div>
  )
}

// ── Pre-OAuth Modal ───────────────────────────────────────────────────────
// Shows overview + redirects to Meta OAuth when user clicks Connect
export function MetaPreConnectModal({
  platform,
  open,
  onClose,
}: {
  platform: Platform
  open: boolean
  onClose: () => void
}) {
  const cfg = PLATFORM_CONFIGS[platform]
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [missingVars, setMissingVars] = useState<string[]>([])

  const handleConnect = async () => {
    setLoading(true)
    setError(null)
    setMissingVars([])
    try {
      const returnUrl = window.location.href.split("?")[0]
      const result = await fetchOAuthUrl(platform as any, returnUrl)
      if (!result.configured) {
        setError(result.error)
        setMissingVars(result.envVars)
        setLoading(false)
        return
      }
      window.location.href = result.url
    } catch (err: any) {
      setError(err.message ?? "Failed to start authentication")
      setLoading(false)
    }
  }

  const platformName = cfg.name
  const Icon = { facebook: FaFacebook, instagram: FaInstagram, whatsapp: FaWhatsapp }[platform as string] ?? FaFacebook

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <div className={cn("relative flex flex-col items-center justify-center gap-3 px-6 py-6 bg-gradient-to-br", cfg.gradient)}>
          <div className="absolute inset-0 bg-black/20" />
          <DialogHeader className="relative z-10 text-center">
            <div className="flex justify-center mb-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm ring-2 ring-white/30">
                <Icon className="h-7 w-7 text-white" />
              </div>
            </div>
            <DialogTitle className="text-white text-base font-semibold">{platformName}</DialogTitle>
            <p className="text-white/70 text-xs mt-0.5">{cfg.category}</p>
          </DialogHeader>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div>
            <h3 className="text-sm font-semibold">{cfg.tagline}</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{cfg.description}</p>
          </div>

          <div className="flex flex-col gap-2">
            {cfg.features.map((f) => (
              <div key={f} className="flex items-start gap-2">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Check className="h-2.5 w-2.5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">{f}</span>
              </div>
            ))}
          </div>

          {error && (
            <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                <p className="text-xs text-destructive">{error}</p>
              </div>
              {missingVars.length > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Required secrets:</p>
                  {missingVars.map((v) => (
                    <code key={v} className="text-[11px] bg-secondary/30 rounded px-1.5 py-0.5 text-foreground font-mono">{v}</code>
                  ))}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Add these in your Replit Secrets panel, then try again.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg border border-border/30 bg-secondary/10 p-3">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/60" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              You'll be redirected to {platform === "whatsapp" ? "Meta" : platformName} to authorize access. LuxeState uses secure OAuth — your credentials are never stored. You can revoke access at any time.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/40 px-6 py-4">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="sm"
            className={cn("gap-2 text-white shadow-lg", `bg-gradient-to-r ${cfg.gradient}`)}
            onClick={handleConnect}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Redirecting…
              </>
            ) : (
              <>
                <ExternalLink className="h-3.5 w-3.5" />
                Connect with {platform === "whatsapp" ? "Meta" : platformName}
                <ChevronRight className="h-3.5 w-3.5 ml-auto" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Post-OAuth Configure Modal ────────────────────────────────────────────
// Shows after OAuth callback to select pages, ad accounts, sync config
type PostStep = "pages" | "ad_accounts" | "configure" | "saving" | "done"

export function MetaPostConnectModal({
  account,
  open,
  onClose,
  onDone,
}: {
  account: ConnectedAccount
  open: boolean
  onClose: () => void
  onDone: () => void
}) {
  const platform = account.provider as Platform
  const cfg = PLATFORM_CONFIGS[platform]
  const qc = useQueryClient()

  const [step, setStep] = useState<PostStep>("pages")
  const [selectedPage, setSelectedPage] = useState<FacebookPage | null>(null)
  const [selectedAdAccount, setSelectedAdAccount] = useState<AdAccount | null>(null)
  const [skipPage, setSkipPage] = useState(false)
  const [skipAd, setSkipAd] = useState(false)
  const [syncInterval, setSyncInterval] = useState(30)
  const [defaultPipeline, setDefaultPipeline] = useState("new")
  const [defaultAgent, setDefaultAgent] = useState(agents[0])

  const { data: pages = [], isLoading: pagesLoading, error: pagesError } = usePages(account.id)
  const { data: adAccounts = [], isLoading: adLoading, error: adError } = useAdAccounts(account.id)
  const saveMetadata = useSaveAccountMetadata()

  const Icon = { facebook: FaFacebook, instagram: FaInstagram, whatsapp: FaWhatsapp }[platform as string] ?? FaFacebook

  const handleSave = async () => {
    setStep("saving")
    const metadata: Record<string, unknown> = {
      sync_interval_minutes: syncInterval,
      default_pipeline: defaultPipeline,
      default_agent: defaultAgent,
    }
    if (selectedPage) {
      metadata.selected_page_id = selectedPage.id
      metadata.selected_page_name = selectedPage.name
    }
    if (selectedAdAccount) {
      metadata.selected_ad_account_id = selectedAdAccount.id
      metadata.selected_ad_account_name = selectedAdAccount.name
    }
    await saveMetadata.mutateAsync({ accountId: account.id, metadata }).catch(() => null)
    qc.invalidateQueries({ queryKey: ["connectedAccounts"] })
    setStep("done")
  }

  const steps: PostStep[] = platform === "whatsapp"
    ? ["configure", "done"]
    : ["pages", "ad_accounts", "configure", "done"]

  const currentIdx = steps.indexOf(step)

  return (
    <Dialog open={open} onOpenChange={() => step !== "saving" && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <div className={cn("relative flex flex-col items-center justify-center gap-3 px-6 py-6 bg-gradient-to-br", cfg.gradient)}>
          <div className="absolute inset-0 bg-black/20" />
          <DialogHeader className="relative z-10 text-center">
            <div className="flex justify-center mb-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm ring-2 ring-white/30">
                {step === "done"
                  ? <CheckCircle2 className="h-7 w-7 text-white" />
                  : <Icon className="h-7 w-7 text-white" />
                }
              </div>
            </div>
            <DialogTitle className="text-white text-base font-semibold">
              {step === "done" ? "All set!" : `Configure ${cfg.name}`}
            </DialogTitle>
            <p className="text-white/70 text-xs mt-0.5">
              {step === "done" ? `${cfg.name} connected successfully` : "A few quick settings"}
            </p>
          </DialogHeader>
          {step !== "done" && step !== "saving" && (
            <div className="relative z-10 flex items-center gap-1.5">
              {steps.filter(s => s !== "done").map((s, i) => (
                <div key={s} className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i < currentIdx ? "w-4 bg-white" : i === currentIdx ? "w-4 bg-white/60" : "w-1.5 bg-white/20"
                )} />
              ))}
            </div>
          )}
        </div>

        <div className="max-h-[440px] overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15 }}
              className="p-6"
            >
              {step === "pages" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-semibold">Select a Facebook Page</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Leads from Lead Ads on this Page will sync into your CRM.
                    </p>
                  </div>
                  {pagesLoading ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Fetching your pages…</span>
                    </div>
                  ) : pagesError ? (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <div>
                        <p className="text-xs text-amber-500">Couldn't load pages from Meta.</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">You can skip this step and configure later.</p>
                      </div>
                    </div>
                  ) : pages.length === 0 ? (
                    <div className="flex items-start gap-2 rounded-lg border border-border/30 bg-secondary/10 p-3">
                      <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">No Pages found. Make sure you granted page access during authorization.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {pages.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedPage(p)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                            selectedPage?.id === p.id ? "border-primary/40 bg-primary/5" : "border-border/40 hover:bg-secondary/20"
                          )}
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/40 text-xs font-bold">
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{p.name}</p>
                            {p.category && <p className="text-xs text-muted-foreground">{p.category}</p>}
                          </div>
                          {selectedPage?.id === p.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => { setSkipPage(true); setStep("ad_accounts") }}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline text-left"
                  >
                    Skip for now
                  </button>
                </div>
              )}

              {step === "ad_accounts" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-semibold">Select an Ad Account</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Lead Ads from this account will be synced automatically.
                    </p>
                  </div>
                  {adLoading ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Fetching ad accounts…</span>
                    </div>
                  ) : adError ? (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <div>
                        <p className="text-xs text-amber-500">Couldn't load ad accounts from Meta.</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">You can skip and configure later.</p>
                      </div>
                    </div>
                  ) : adAccounts.length === 0 ? (
                    <div className="flex items-start gap-2 rounded-lg border border-border/30 bg-secondary/10 p-3">
                      <Hash className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">No ad accounts found for this account.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {adAccounts.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => setSelectedAdAccount(a)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                            selectedAdAccount?.id === a.id ? "border-primary/40 bg-primary/5" : "border-border/40 hover:bg-secondary/20"
                          )}
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/40">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{a.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {a.currency && <span className="text-xs text-muted-foreground">{a.currency}</span>}
                              {a.lead_gen_enabled && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/30 text-emerald-400">Lead Gen ✓</Badge>
                              )}
                              {a.account_status === 1 && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/30 text-emerald-400">Active</Badge>
                              )}
                            </div>
                          </div>
                          {selectedAdAccount?.id === a.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => { setSkipAd(true); setStep("configure") }}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline text-left"
                  >
                    Skip for now
                  </button>
                </div>
              )}

              {step === "configure" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-semibold">Sync settings</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Configure how leads are imported into your CRM.
                    </p>
                  </div>

                  {selectedPage && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <p className="text-xs text-emerald-400 truncate">Page: {selectedPage.name}</p>
                    </div>
                  )}

                  {selectedAdAccount && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <p className="text-xs text-emerald-400 truncate">Ad Account: {selectedAdAccount.name}</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium">Sync frequency</label>
                      <select
                        value={syncInterval}
                        onChange={(e) => setSyncInterval(Number(e.target.value))}
                        className={cn(surfaceSelectClass, "h-9 text-sm")}
                      >
                        <option value={15}>Every 15 minutes</option>
                        <option value={30}>Every 30 minutes</option>
                        <option value={60}>Every hour</option>
                        <option value={360}>Every 6 hours</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium">Default pipeline</label>
                      <select
                        value={defaultPipeline}
                        onChange={(e) => setDefaultPipeline(e.target.value)}
                        className={cn(surfaceSelectClass, "h-9 text-sm")}
                      >
                        <option value="new">New Leads</option>
                        <option value="qualified">Qualified</option>
                        <option value="contact">Contact Made</option>
                        <option value="viewing">Viewing Scheduled</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium">Assign to agent</label>
                      <select
                        value={defaultAgent}
                        onChange={(e) => setDefaultAgent(e.target.value)}
                        className={cn(surfaceSelectClass, "h-9 text-sm")}
                      >
                        {agents.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {step === "saving" && (
                <div className="flex flex-col items-center gap-5 py-8">
                  <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg", cfg.gradient)}>
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold">Saving configuration…</p>
                    <p className="mt-1 text-xs text-muted-foreground">Almost there</p>
                  </div>
                </div>
              )}

              {step === "done" && (
                <div className="flex flex-col items-center gap-5 py-4">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-4 ring-emerald-500/20"
                  >
                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-sm font-semibold">{cfg.name} is connected!</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedAdAccount
                        ? `Lead Ads from "${selectedAdAccount.name}" will sync automatically.`
                        : "Your account is connected. Configure ad accounts anytime to start syncing leads."}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 w-full text-center">
                    {selectedPage && (
                      <p className="text-[11px] text-muted-foreground">Page: <span className="text-foreground">{selectedPage.name}</span></p>
                    )}
                    {selectedAdAccount && (
                      <p className="text-[11px] text-muted-foreground">Ad Account: <span className="text-foreground">{selectedAdAccount.name}</span></p>
                    )}
                  </div>
                  <Button className="w-full" onClick={onDone}>
                    Go to Lead Sources
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {!["saving", "done"].includes(step) && (
          <div className="flex items-center justify-between border-t border-border/40 px-6 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (step === "pages") onClose()
                else if (step === "ad_accounts") setStep("pages")
                else if (step === "configure") setStep(platform === "whatsapp" ? "configure" : "ad_accounts")
              }}
            >
              {step === "pages" ? "Skip setup" : "Back"}
            </Button>

            {step === "pages" && (
              <Button
                size="sm"
                disabled={pages.length > 0 && !selectedPage && !pagesLoading}
                className="gap-1.5 bg-primary hover:bg-primary/90"
                onClick={() => setStep("ad_accounts")}
              >
                {selectedPage ? "Continue" : "Skip"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}

            {step === "ad_accounts" && (
              <Button
                size="sm"
                className="gap-1.5 bg-primary hover:bg-primary/90"
                onClick={() => setStep("configure")}
              >
                {selectedAdAccount ? "Continue" : "Skip"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}

            {step === "configure" && (
              <Button
                size="sm"
                className="gap-1.5 bg-primary hover:bg-primary/90"
                onClick={handleSave}
              >
                <Settings2 className="h-3.5 w-3.5" />
                Save & Finish
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
