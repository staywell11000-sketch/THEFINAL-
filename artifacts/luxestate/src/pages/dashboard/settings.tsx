import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { ConnectedAccountsTab } from "@/components/dashboard/connected-accounts-tab"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { surfaceInputClass } from "@/lib/ui-classes"
import {
  User,
  Bell,
  Shield,
  Palette,
  MessageCircle,
  Building2,
  Sun,
  Moon,
  Monitor,
  Link2,
} from "lucide-react"
import { toast } from "sonner"

const tabs = [
  { id: "profile",    label: "Profile",            icon: User },
  { id: "accounts",   label: "Connected Accounts", icon: Link2 },
  { id: "notifications", label: "Notifications",   icon: Bell },
  { id: "security",   label: "Security",           icon: Shield },
  { id: "appearance", label: "Appearance",         icon: Palette },
  { id: "whatsapp",   label: "WhatsApp",           icon: MessageCircle },
  { id: "branding",   label: "Branding",           icon: Building2 },
]

const themeOptions = [
  { id: "light",  label: "Light",  icon: Sun },
  { id: "dark",   label: "Dark",   icon: Moon },
  { id: "system", label: "System", icon: Monitor },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile")
  const { theme, setTheme } = useTheme()

  // ── Parse URL params from OAuth redirect ─────────────────
  const [connectedProvider, setConnectedProvider] = useState<string | null>(null)
  const [oauthError, setOauthError]               = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab       = params.get("tab")
    const connected = params.get("connected")
    const error     = params.get("error")
    const provider  = params.get("provider")

    if (tab === "accounts" || connected || error) {
      setActiveTab("accounts")

      if (connected) {
        setConnectedProvider(connected)
        // Clean URL without reloading
        const cleanUrl = window.location.pathname
        window.history.replaceState({}, "", cleanUrl)
      } else if (error) {
        const msg = provider ? `${provider}: ${error}` : error
        setOauthError(decodeURIComponent(msg))
        const cleanUrl = window.location.pathname
        window.history.replaceState({}, "", cleanUrl)
      }
    }
  }, [])

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Settings"
        description="Manage your account preferences and integrations."
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar */}
        <motion.nav
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-row gap-1 overflow-x-auto pb-1 lg:flex-col lg:w-52 lg:pb-0"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4 flex-shrink-0" />
              {tab.label}
            </button>
          ))}
        </motion.nav>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1 min-w-0"
        >
          {/* ── Profile ─────────────────────────────────── */}
          {activeTab === "profile" && (
            <div className="glass-card p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Profile Information</h3>
                <p className="text-sm text-muted-foreground">
                  Update your personal details and contact information.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-2xl font-bold text-primary-foreground">
                  JD
                </div>
                <Button variant="outline" className="border-border/50">
                  Change Avatar
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  { label: "First Name",  placeholder: "James",              defaultValue: "James" },
                  { label: "Last Name",   placeholder: "Donovan",            defaultValue: "Donovan" },
                  { label: "Email",       placeholder: "james@luxestate.app", defaultValue: "james@luxestate.app" },
                  { label: "Phone",       placeholder: "+1 (555) 000-0000",  defaultValue: "+1 (555) 123-4567" },
                  { label: "Title",       placeholder: "Senior Agent",       defaultValue: "Senior Agent" },
                  { label: "Office",      placeholder: "Beverly Hills",      defaultValue: "Beverly Hills" },
                ].map((field) => (
                  <div key={field.label} className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">{field.label}</label>
                    <Input
                      defaultValue={field.defaultValue}
                      placeholder={field.placeholder}
                      className={surfaceInputClass}
                    />
                  </div>
                ))}
              </div>
              <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
                Save Changes
              </Button>
            </div>
          )}

          {/* ── Connected Accounts ───────────────────────── */}
          {activeTab === "accounts" && (
            <ConnectedAccountsTab
              connectedProvider={connectedProvider}
              errorMessage={oauthError}
            />
          )}

          {/* ── Appearance ───────────────────────────────── */}
          {activeTab === "appearance" && (
            <div className="glass-card p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Appearance</h3>
                <p className="text-sm text-muted-foreground">
                  Customize how LuxeState looks on your device.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">Theme</label>
                <div className="grid grid-cols-3 gap-3">
                  {themeOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setTheme(opt.id)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all",
                        theme === opt.id
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-primary/50"
                      )}
                    >
                      <opt.icon
                        className={cn(
                          "h-6 w-6",
                          theme === opt.id ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm font-medium",
                          theme === opt.id ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Notifications ────────────────────────────── */}
          {activeTab === "notifications" && (
            <div className="glass-card p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Configure how and when you receive notifications.
                </p>
              </div>
              <div className="space-y-4">
                {[
                  { label: "New lead assigned",    description: "Get notified when a lead is assigned to you",     enabled: true },
                  { label: "Deal status change",   description: "When a deal moves through the pipeline",          enabled: true },
                  { label: "WhatsApp messages",    description: "Receive WhatsApp message notifications",          enabled: true },
                  { label: "Property views",       description: "When someone views your property listing",        enabled: false },
                  { label: "Weekly report",        description: "Summary of your weekly performance",              enabled: true },
                  { label: "Marketing emails",     description: "LuxeState product updates and tips",              enabled: false },
                ].map((notif) => (
                  <div
                    key={notif.label}
                    className="flex items-center justify-between rounded-xl border border-border/50 p-4"
                  >
                    <div>
                      <p className="font-medium text-foreground">{notif.label}</p>
                      <p className="text-sm text-muted-foreground">{notif.description}</p>
                    </div>
                    <button
                      className={cn(
                        "relative h-6 w-11 rounded-full transition-colors",
                        notif.enabled ? "bg-primary" : "bg-muted"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                          notif.enabled ? "translate-x-5" : "translate-x-0.5"
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── WhatsApp ─────────────────────────────────── */}
          {activeTab === "whatsapp" && (
            <div className="glass-card p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  WhatsApp Business Integration
                </h3>
                <p className="text-sm text-muted-foreground">
                  Configure your WhatsApp Business API connection.
                </p>
              </div>
              <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                    <MessageCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">WhatsApp Business Connected</p>
                    <p className="text-sm text-muted-foreground">+1 (888) 555-0123</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto border-green-500/30 text-green-600 hover:bg-green-500/10"
                  >
                    Reconnect
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Default Message Template</label>
                  <textarea
                    className={cn(
                      "w-full min-h-[100px] resize-none rounded-xl border border-border/50 bg-secondary/30 px-3 py-2 text-sm",
                      "focus:outline-none focus:ring-2 focus:ring-ring/50"
                    )}
                    defaultValue="Hi {name}, I'm reaching out about {property}. Are you available for a brief call to discuss your requirements?"
                  />
                </div>
                <Button className="bg-primary hover:bg-primary/90">Save Template</Button>
              </div>
            </div>
          )}

          {/* ── Security / Branding (placeholders) ──────── */}
          {(activeTab === "security" || activeTab === "branding") && (
            <div className="glass-card p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1 capitalize">
                  {activeTab} Settings
                </h3>
                <p className="text-sm text-muted-foreground">
                  Configure your {activeTab} preferences.
                </p>
              </div>
              <div className="rounded-xl border border-dashed border-border/60 py-16 text-center">
                <p className="text-muted-foreground">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} settings coming soon.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
