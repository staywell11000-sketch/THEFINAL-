import { useState } from "react"
import { useLocation } from "wouter"
import { Link } from "wouter"
import { Sidebar } from "@/components/dashboard/sidebar"
import { NotificationsPanel, type Notification } from "@/components/dashboard/notifications-panel"
import { ReactNode } from "react"
import { motion } from "framer-motion"
import { Bell, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useCurrentUser } from "@/lib/user-api"

const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: 1, type: "lead", read: false, group: "today",
    title: "Hot lead detected — Sarah Mitchell",
    description: "AI urgency score jumped to 94. Immediate follow-up recommended before 6 PM.",
    time: "2 minutes ago",
    avatar: "SM",
  },
  {
    id: 2, type: "message", read: false, group: "today",
    title: "3 unread messages",
    description: "Emily Rodriguez, Michael Chen, and David Park sent new WhatsApp messages.",
    time: "14 minutes ago",
  },
  {
    id: 3, type: "reminder", read: false, group: "today",
    title: "Reminder: Follow up with Michael Chen",
    description: "Proposal sent 48 hours ago with no reply. Send updated Beverly Hills comps.",
    time: "1 hour ago",
  },
  {
    id: 4, type: "deal", read: false, group: "today",
    title: "Deal updated — Manhattan Penthouse",
    description: "Sarah Mitchell's deal moved to Due Diligence stage. HOA docs still pending.",
    time: "2 hours ago",
  },
  {
    id: 5, type: "reminder", read: false, group: "today",
    title: "Viewing scheduled for tomorrow",
    description: "Beverly Hills Estate tour with Michael Chen at 2:00 PM.",
    time: "3 hours ago",
  },
  {
    id: 6, type: "team", read: true, group: "today",
    title: "Emily Rodriguez closed her first deal",
    description: "Congratulations! Emily closed a $3.1M deal. Total Q2 revenue now $57.4M.",
    time: "5 hours ago",
  },
  {
    id: 7, type: "lead", read: true, group: "earlier",
    title: "New lead assigned — Lisa Thornton",
    description: "Referred by Amanda Foster. Interested in Beverly Hills properties, budget $4–6M.",
    time: "Yesterday, 4:30 PM",
  },
  {
    id: 8, type: "deal", read: true, group: "earlier",
    title: "Deal closed — Malibu Beach House",
    description: "Amanda Foster's $16M deal successfully closed. Commission of $480K earned.",
    time: "Yesterday, 2:15 PM",
  },
]

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":              "Overview",
  "/dashboard/leads":        "Leads",
  "/dashboard/properties":   "Properties",
  "/dashboard/messages":     "Messages",
  "/dashboard/analytics":    "Analytics",
  "/dashboard/ai-intelligence": "AI Intelligence",
  "/dashboard/automations":  "Automations",
  "/dashboard/team":         "Team",
  "/dashboard/deals":        "Deals",
  "/dashboard/documents":    "Documents",
  "/dashboard/calendar":     "Calendar",
  "/dashboard/settings":     "Settings",
  "/dashboard/integrations": "Lead Sources",
}

function getPageTitle(location: string): string {
  if (PAGE_TITLES[location]) return PAGE_TITLES[location]
  if (location.startsWith("/dashboard/leads/")) return "Lead Profile"
  return "Dashboard"
}

function GlobalHeader({
  unreadCount, notifOpen, onToggleNotif,
}: {
  unreadCount: number; notifOpen: boolean; onToggleNotif: () => void
}) {
  const [location] = useLocation()
  const { user } = useAuth()
  const { data: profile } = useCurrentUser()
  const title = getPageTitle(location)

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  })

  const displayName =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : user?.email?.split("@")[0] || "User"

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border/40 bg-card/60 px-6 backdrop-blur-sm lg:px-8">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        <span className="hidden text-xs text-muted-foreground sm:block">{today}</span>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
          <Search className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleNotif}
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>

        {/* Avatar → settings */}
        <Link href="/dashboard/settings">
          <div className="ml-2 cursor-pointer">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={displayName}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-border/40 hover:ring-primary/50 transition-all"
                title="Profile Settings"
              />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-accent/80 text-sm font-semibold text-primary-foreground hover:ring-2 hover:ring-primary/40 transition-all"
                title="Profile Settings"
              >
                {initials}
              </div>
            )}
          </div>
        </Link>
      </div>
    </header>
  )
}

type DashboardLayoutProps = { children: ReactNode }

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed]     = useState(false)
  const [notifOpen, setNotifOpen]     = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(SEED_NOTIFICATIONS)

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkRead    = (id: number) => setNotifications((p) => p.map((n) => n.id === id ? { ...n, read: true } : n))
  const handleMarkAllRead = ()           => setNotifications((p) => p.map((n) => ({ ...n, read: true })))
  const handleDismiss     = (id: number) => setNotifications((p) => p.filter((n) => n.id !== id))

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        notifOpen={notifOpen}
        onToggleNotif={() => setNotifOpen((v) => !v)}
        unreadCount={unreadCount}
      />
      <NotificationsPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        onDismiss={handleDismiss}
        sidebarWidth={collapsed ? 72 : 240}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <GlobalHeader
          unreadCount={unreadCount}
          notifOpen={notifOpen}
          onToggleNotif={() => setNotifOpen((v) => !v)}
        />
        <motion.main
          className="flex-1 overflow-y-auto"
          animate={{ marginLeft: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="min-h-full p-6 lg:p-8">
            {children}
          </div>
        </motion.main>
      </div>
    </div>
  )
}
