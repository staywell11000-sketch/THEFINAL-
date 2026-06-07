import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api-fetch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, DollarSign, TrendingUp, Building2 } from "lucide-react"

export default function AdminAiUsage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-ai-stats"],
    queryFn: () => apiFetch("/api/admin/ai-stats").then(r => r.json()).catch(() => ({ total_requests: 0, total_tokens: 0, total_cost: 0, by_org: [] })),
  })

  const { data: recentData } = useQuery({
    queryKey: ["admin-ai-recent"],
    queryFn: () => apiFetch("/api/admin/ai-usage-log").then(r => r.json()).catch(() => ({ data: [] })),
  })

  const s = data ?? {}
  const byOrg: any[] = s.by_org ?? []
  const recent: any[] = recentData?.data ?? []

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">AI Usage Analytics</h1>
        <p className="text-muted-foreground text-sm">OpenAI API consumption across all organizations</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: "Total AI Requests", value: Number(s.total_requests ?? 0).toLocaleString(), icon: Zap, color: "bg-amber-500" },
          { title: "Total Tokens", value: Number(s.total_tokens ?? 0).toLocaleString(), icon: TrendingUp, color: "bg-blue-500" },
          { title: "Est. OpenAI Cost", value: `$${Number(s.total_cost ?? 0).toFixed(4)}`, icon: DollarSign, color: "bg-green-500" },
          { title: "Avg Cost/Org", value: `$${Number(s.avg_cost_per_org ?? 0).toFixed(4)}`, icon: Building2, color: "bg-purple-500" },
        ].map(({ title, value, icon: Icon, color }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {byOrg.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Cost by Organization</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {byOrg.map((row: any) => (
                <div key={row.organization_id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm font-medium">{row.org_name ?? `Org #${row.organization_id}`}</span>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>{Number(row.requests).toLocaleString()} requests</span>
                    <span>{Number(row.total_tokens).toLocaleString()} tokens</span>
                    <span className="font-semibold text-foreground">${Number(row.cost).toFixed(4)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {recent.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Recent AI Calls</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              {recent.slice(0, 50).map((row: any) => (
                <div key={row.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{row.feature}</span>
                    <span className="text-muted-foreground text-xs">{row.model}</span>
                    <span className="text-muted-foreground text-xs">{row.org_name ?? `Org #${row.organization_id}`}</span>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground text-xs">
                    <span>{Number(row.total_tokens).toLocaleString()} tokens</span>
                    <span>${Number(row.estimated_cost ?? 0).toFixed(6)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
