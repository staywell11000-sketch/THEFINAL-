import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api-fetch"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText } from "lucide-react"
import { format } from "date-fns"

const ACTION_COLORS: Record<string, string> = {
  "org.updated": "bg-blue-100 text-blue-700",
  "org.suspended": "bg-red-100 text-red-700",
  "org.unsuspended": "bg-green-100 text-green-700",
  "subscription.approved": "bg-green-100 text-green-700",
  "payment.approved": "bg-green-100 text-green-700",
  "payment.rejected": "bg-red-100 text-red-700",
  "addon.granted": "bg-purple-100 text-purple-700",
  "addon.approved": "bg-purple-100 text-purple-700",
}

export default function AdminAuditLogs() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: () => apiFetch("/api/admin/audit-logs").then(r => r.json()),
    refetchInterval: 30_000,
  })

  const logs: any[] = data?.data ?? []

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground text-sm">All admin actions and system events</p>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No audit logs yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log: any) => (
            <Card key={log.id}>
              <CardContent className="p-3 flex items-start justify-between gap-4">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-xs font-mono ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-700"}`}>{log.action}</Badge>
                    {log.org_name && <span className="text-sm font-medium truncate">{log.org_name}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{log.actor_email ?? log.actor_id ?? "System"}</p>
                  {log.meta && typeof log.meta === "object" && (
                    <p className="text-xs text-muted-foreground font-mono truncate">{JSON.stringify(log.meta)}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground shrink-0">{format(new Date(log.created_at), "MMM d, h:mm a")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
