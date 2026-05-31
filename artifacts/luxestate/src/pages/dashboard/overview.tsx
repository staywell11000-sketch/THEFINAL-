import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { AnalyticsChart } from "@/components/dashboard/analytics-chart"
import { PropertyShowcase } from "@/components/dashboard/property-showcase"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { AddLeadModal } from "@/components/dashboard/add-lead-modal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Clock, TrendingUp, AlertCircle, CheckCircle2, User } from "lucide-react"
import { cn } from "@/lib/utils"

type FollowUp = {
  id: number
  lead: string
  action: string
  due: string
  priority: "hot" | "warm" | "cold"
  avatar: string
}

const initialFollowUps: FollowUp[] = [
  { id: 1, lead: "Sarah Mitchell", action: "Discuss HOA terms", due: "Today", priority: "hot", avatar: "SM" },
  { id: 2, lead: "Emily Rodriguez", action: "Schedule property viewing", due: "Tomorrow", priority: "hot", avatar: "ER" },
  { id: 3, lead: "Michael Chen", action: "Send updated comps", due: "May 30", priority: "warm", avatar: "MC" },
  { id: 4, lead: "Robert Chang", action: "Follow up on cold call", due: "Jun 1", priority: "warm", avatar: "RC" },
  { id: 5, lead: "David Park", action: "Send property shortlist", due: "Jun 3", priority: "cold", avatar: "DP" },
]

const priorityDot: Record<string, string> = {
  hot: "bg-red-500",
  warm: "bg-orange-500",
  cold: "bg-blue-400",
}

const teamPerformance = [
  { name: "James Donovan", leads: 12, deals: 4, revenue: "$22.4M", rate: "33%", trend: "up" },
  { name: "Sarah Mitchell", leads: 9, deals: 3, revenue: "$15.1M", rate: "33%", trend: "up" },
  { name: "Michael Chen", leads: 11, deals: 2, revenue: "$8.7M", rate: "18%", trend: "down" },
  { name: "Emily Rodriguez", leads: 8, deals: 3, revenue: "$11.2M", rate: "38%", trend: "up" },
]

export default function OverviewPage() {
  const [showAddLead, setShowAddLead] = useState(false)
  const [followUps, setFollowUps] = useState<FollowUp[]>(initialFollowUps)
  const [doneFlash, setDoneFlash] = useState<number | null>(null)

  const markFollowUpDone = (id: number) => {
    setDoneFlash(id)
    setTimeout(() => {
      setFollowUps((prev) => prev.filter((f) => f.id !== id))
      setDoneFlash(null)
    }, 600)
  }

  const todayCount = followUps.filter((f) => f.due === "Today").length

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Dashboard Overview"
        description="Welcome back, James. Here's what's happening today."
        actions={
          <Button
            onClick={() => setShowAddLead(true)}
            className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
          >
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
        }
      />

      <StatsCards />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AnalyticsChart />
        </div>
        <QuickActions onLeadAdded={() => {}} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <PropertyShowcase />
          </motion.div>
        </div>
        <RecentActivity />
      </div>

      {/* Pending Follow-ups + Team Performance */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                Pending Follow-ups
              </h3>
              <p className="text-sm text-muted-foreground">Actions due this week</p>
            </div>
            {todayCount > 0 && (
              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                <AlertCircle className="mr-1 h-3 w-3" />
                {todayCount} today
              </Badge>
            )}
          </div>

          <div className="space-y-3 min-h-[60px]">
            <AnimatePresence>
              {followUps.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-2 py-6 text-center"
                >
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  <p className="text-sm font-medium text-foreground">All caught up!</p>
                  <p className="text-xs text-muted-foreground">No pending follow-ups</p>
                </motion.div>
              ) : (
                followUps.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: doneFlash === item.id ? 0.4 : 1, x: 0 }}
                    exit={{ opacity: 0, x: 40, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-3 rounded-xl border border-border/40 bg-secondary/20 p-3"
                  >
                    <div className="relative flex-shrink-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-accent/80 text-xs font-semibold text-primary-foreground">
                        {item.avatar}
                      </div>
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
                          priorityDot[item.priority]
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{item.lead}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.action}</p>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          item.due === "Today" ? "text-red-500" : "text-muted-foreground"
                        )}
                      >
                        {item.due}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markFollowUpDone(item.id)}
                        className="h-6 px-2 text-xs text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Done
                      </Button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <div className="mb-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <User className="h-4 w-4 text-primary" />
              Team Performance
            </h3>
            <p className="text-sm text-muted-foreground">Month-to-date results</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Agent</th>
                  <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Leads</th>
                  <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Deals</th>
                  <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Revenue</th>
                  <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {teamPerformance.map((agent) => (
                  <tr key={agent.name} className="group">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/50 to-accent/50 text-xs font-semibold text-primary-foreground">
                          {agent.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <span className="truncate font-medium text-foreground">{agent.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right text-muted-foreground">{agent.leads}</td>
                    <td className="py-3 text-right font-medium text-foreground">{agent.deals}</td>
                    <td className="py-3 text-right font-semibold text-foreground">{agent.revenue}</td>
                    <td className="py-3 text-right">
                      <span className={cn("font-semibold", agent.trend === "up" ? "text-emerald-500" : "text-red-500")}>
                        {agent.trend === "up" ? <TrendingUp className="inline h-3.5 w-3.5 mr-0.5" /> : null}
                        {agent.rate}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      <AddLeadModal
        open={showAddLead}
        onClose={() => setShowAddLead(false)}
      />
    </div>
  )
}
