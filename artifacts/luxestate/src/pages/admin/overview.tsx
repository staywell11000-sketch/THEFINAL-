import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api-fetch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, CreditCard, Zap, TrendingUp, Clock, CheckCircle2, XCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

function StatCard({ title, value, sub, icon: Icon, color }: { title: string; value: string | number; sub?: string; icon: any; color: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export default function AdminOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => apiFetch("/api/admin/stats").then(r => r.json()),
    refetchInterval: 30_000,
  })

  const { data: aiData } = useQuery({
    queryKey: ["admin-ai-stats"],
    queryFn: () => apiFetch("/api/admin/ai-stats").then(r => r.json()).catch(() => null),
  })

  const s = data?.stats

  if (isLoading) return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Super Admin Overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Super Admin Overview</h1>
        <p className="text-muted-foreground text-sm">Platform-wide metrics and health</p>
      </div>

      {/* Organization stats */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Organizations</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Orgs" value={s?.total_orgs ?? 0} icon={Building2} color="bg-blue-500" />
          <StatCard title="Active" value={s?.active_orgs ?? 0} sub="Paying subscriptions" icon={CheckCircle2} color="bg-green-500" />
          <StatCard title="Trial" value={s?.trial_orgs ?? 0} sub="In trial period" icon={Clock} color="bg-yellow-500" />
          <StatCard title="Suspended" value={s?.suspended_orgs ?? 0} icon={XCircle} color="bg-red-500" />
        </div>
      </div>

      {/* Revenue */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Revenue</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={s?.total_users ?? 0} icon={Users} color="bg-purple-500" />
          <StatCard title="Pending Payments" value={s?.pending_payments ?? 0} sub="Awaiting approval" icon={Clock} color="bg-yellow-500" />
          <StatCard title="Approved Payments" value={s?.approved_payments ?? 0} icon={CreditCard} color="bg-green-500" />
          <StatCard title="Total Revenue" value={`Rs. ${Number(s?.total_revenue ?? 0).toLocaleString()}`} icon={TrendingUp} color="bg-emerald-500" />
        </div>
      </div>

      {/* AI Usage */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">AI Usage</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="AI Requests Used" value={Number(aiData?.total_requests ?? 0).toLocaleString()} icon={Zap} color="bg-amber-500" />
          <StatCard title="Total Tokens" value={Number(aiData?.total_tokens ?? 0).toLocaleString()} icon={Zap} color="bg-orange-500" />
          <StatCard title="Est. OpenAI Cost" value={`$${Number(aiData?.total_cost ?? 0).toFixed(4)}`} icon={CreditCard} color="bg-red-500" />
          <StatCard title="Avg Cost/Org" value={`$${Number(aiData?.avg_cost_per_org ?? 0).toFixed(4)}`} icon={TrendingUp} color="bg-pink-500" />
        </div>
      </div>
    </div>
  )
}
