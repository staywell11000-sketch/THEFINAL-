import { motion, AnimatePresence } from "framer-motion"
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Flame,
  MessageCircle,
  Clock,
  TrendingUp,
  Building2,
  Users2,
  CalendarDays,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type Notification = {
  id: number
  type: "lead" | "message" | "reminder" | "deal" | "property" | "team" | "system"
  title: string
  description: string
  time: string
  read: boolean
  group: "today" | "earlier"
  avatar?: string
}

const typeConfig: Record<Notification["type"], { icon: React.ElementType; color: string; bg: string }> = {
  lead: { icon: Flame, color: "text-red-500", bg: "bg-red-500/10" },
  message: { icon: MessageCircle, color: "text-blue-500", bg: "bg-blue-500/10" },
  reminder: { icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
  deal: { icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  property: { icon: Building2, color: "text-purple-500", bg: "bg-purple-500/10" },
  team: { icon: Users2, color: "text-primary", bg: "bg-primary/10" },
  system: { icon: Zap, color: "text-muted-foreground", bg: "bg-secondary" },
}

type NotificationsPanelProps = {
  open: boolean
  onClose: () => void
  notifications: Notification[]
  onMarkRead: (id: number) => void
  onMarkAllRead: () => void
  onDismiss: (id: number) => void
  sidebarWidth: number
}

export function NotificationsPanel({
  open,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  sidebarWidth,
}: NotificationsPanelProps) {
  const unread = notifications.filter((n) => !n.read).length
  const todayNots = notifications.filter((n) => n.group === "today")
  const earlierNots = notifications.filter((n) => n.group === "earlier")

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-background/30 backdrop-blur-[1px]"
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            style={{ left: sidebarWidth }}
            className="fixed top-0 z-50 flex h-full w-80 flex-col border-r border-border/60 bg-sidebar shadow-2xl"
          >
            {/* Header */}
            <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border/50 px-5">
              <div className="flex items-center gap-2.5">
                <Bell className="h-5 w-5 text-foreground" />
                <span className="font-semibold text-foreground">Notifications</span>
                {unread > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {unread}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onMarkAllRead}
                    className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/50">
                    <Bell className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                  <p className="font-semibold text-foreground">All caught up</p>
                  <p className="text-sm text-muted-foreground">No new notifications right now.</p>
                </div>
              ) : (
                <>
                  {todayNots.length > 0 && (
                    <section>
                      <div className="sticky top-0 bg-sidebar px-5 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Today
                        </p>
                      </div>
                      <div className="space-y-px px-2 pb-2">
                        {todayNots.map((n) => (
                          <NotificationItem
                            key={n.id}
                            notification={n}
                            onMarkRead={onMarkRead}
                            onDismiss={onDismiss}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                  {earlierNots.length > 0 && (
                    <section>
                      <div className="sticky top-0 bg-sidebar px-5 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Earlier
                        </p>
                      </div>
                      <div className="space-y-px px-2 pb-4">
                        {earlierNots.map((n) => (
                          <NotificationItem
                            key={n.id}
                            notification={n}
                            onMarkRead={onMarkRead}
                            onDismiss={onDismiss}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-border/50 p-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 border-border/50 text-xs">
                  <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                  View calendar
                </Button>
                <Button variant="outline" size="sm" className="flex-1 border-border/50 text-xs">
                  <Bell className="mr-1.5 h-3.5 w-3.5" />
                  Settings
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function NotificationItem({
  notification: n,
  onMarkRead,
  onDismiss,
}: {
  notification: Notification
  onMarkRead: (id: number) => void
  onDismiss: (id: number) => void
}) {
  const cfg = typeConfig[n.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      onClick={() => !n.read && onMarkRead(n.id)}
      className={cn(
        "group relative flex cursor-pointer gap-3 rounded-xl p-3 transition-colors hover:bg-secondary/30",
        !n.read && "bg-primary/4"
      )}
    >
      {/* Unread dot */}
      {!n.read && (
        <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary" />
      )}

      {/* Icon or avatar */}
      <div className="relative flex-shrink-0">
        {n.avatar ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-accent/80 text-xs font-bold text-primary-foreground">
            {n.avatar}
          </div>
        ) : (
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", cfg.bg)}>
            <cfg.icon className={cn("h-4 w-4", cfg.color)} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pr-5">
        <p className={cn("text-sm leading-snug", n.read ? "text-muted-foreground" : "font-semibold text-foreground")}>
          {n.title}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{n.description}</p>
        <p className="mt-1 text-xs text-muted-foreground/70">{n.time}</p>
      </div>

      {/* Dismiss (hover only) */}
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(n.id) }}
        className="absolute right-3 top-3 hidden rounded-md p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground group-hover:flex"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  )
}
