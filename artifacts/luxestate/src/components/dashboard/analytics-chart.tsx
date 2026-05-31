import { useState } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const monthlyData = [
  { name: "Jan", leads: 186, deals: 80, revenue: 2400 },
  { name: "Feb", leads: 305, deals: 120, revenue: 3800 },
  { name: "Mar", leads: 237, deals: 95, revenue: 2800 },
  { name: "Apr", leads: 473, deals: 180, revenue: 5200 },
  { name: "May", leads: 409, deals: 165, revenue: 4800 },
  { name: "Jun", leads: 520, deals: 210, revenue: 6100 },
  { name: "Jul", leads: 438, deals: 175, revenue: 5400 },
  { name: "Aug", leads: 555, deals: 225, revenue: 6800 },
  { name: "Sep", leads: 490, deals: 195, revenue: 5900 },
  { name: "Oct", leads: 612, deals: 250, revenue: 7500 },
  { name: "Nov", leads: 580, deals: 235, revenue: 7100 },
  { name: "Dec", leads: 650, deals: 280, revenue: 8200 },
]

const tabs = [
  { id: "leads", label: "Leads" },
  { id: "deals", label: "Deals" },
  { id: "revenue", label: "Revenue" },
]

export function AnalyticsChart() {
  const [activeTab, setActiveTab] = useState("leads")

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card px-3 py-2">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-lg font-bold text-primary">
            {activeTab === "revenue" ? `$${payload[0].value.toLocaleString()}` : payload[0].value.toLocaleString()}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="glass-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Performance Analytics</h3>
          <p className="text-sm text-muted-foreground">Track your growth over time</p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative px-4 py-1.5 text-sm font-medium rounded-lg transition-colors",
                activeTab === tab.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-background rounded-lg shadow-sm"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === "revenue" ? (
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                className="text-xs fill-muted-foreground"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                className="text-xs fill-muted-foreground"
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey={activeTab}
                fill="oklch(0.65 0.15 75)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : (
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.65 0.15 75)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.65 0.15 75)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                className="text-xs fill-muted-foreground"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                className="text-xs fill-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey={activeTab}
                stroke="oklch(0.65 0.15 75)"
                strokeWidth={2}
                fill="url(#colorGradient)"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
