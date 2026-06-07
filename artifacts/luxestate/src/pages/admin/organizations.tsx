import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api-fetch"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Search, Building2, CheckCircle2, Clock, XCircle, Ban, RefreshCw } from "lucide-react"
import { format } from "date-fns"

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  trial: "bg-yellow-100 text-yellow-700 border-yellow-200",
  expired: "bg-gray-100 text-gray-700 border-gray-200",
  suspended: "bg-red-100 text-red-700 border-red-200",
}

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-blue-100 text-blue-700 border-blue-200",
  professional: "bg-purple-100 text-purple-700 border-purple-200",
  agency: "bg-amber-100 text-amber-700 border-amber-200",
  trial: "bg-gray-100 text-gray-600 border-gray-200",
}

function ApproveDialog({ org, onSuccess }: { org: any; onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [plan, setPlan] = useState(org.plan)
  const [months, setMonths] = useState("1")
  const { toast } = useToast()

  const mutation = useMutation({
    mutationFn: () => apiFetch(`/api/admin/organizations/${org.id}/approve-subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, months: parseInt(months) }),
    }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Subscription approved" })
      setOpen(false)
      onSuccess()
    },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  })

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>Approve</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve Subscription — {org.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Plan</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter — Rs. 9,999</SelectItem>
                  <SelectItem value="professional">Professional — Rs. 19,999</SelectItem>
                  <SelectItem value="agency">Agency — Rs. 25,000</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Duration (months)</Label>
              <Input type="number" min="1" max="24" value={months} onChange={e => setMonths(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "Approving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function GrantAddonDialog({ org, onSuccess }: { org: any; onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [addonType, setAddonType] = useState("ai_requests")
  const [quantity, setQuantity] = useState("500")
  const { toast } = useToast()

  const mutation = useMutation({
    mutationFn: () => apiFetch("/api/admin/addons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: org.id, addonType, quantity: parseInt(quantity) }),
    }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Add-on granted" })
      setOpen(false)
      onSuccess()
    },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  })

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Grant Add-on</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Grant Add-on — {org.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Add-on Type</Label>
              <Select value={addonType} onValueChange={setAddonType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai_requests">AI Requests</SelectItem>
                  <SelectItem value="leads">Extra Leads</SelectItem>
                  <SelectItem value="storage">Storage</SelectItem>
                  <SelectItem value="whatsapp_accounts">WhatsApp Accounts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Quantity</Label>
              <Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "Granting..." : "Grant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function AdminOrganizations() {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const qc = useQueryClient()
  const { toast } = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orgs", search, status],
    queryFn: () => apiFetch(`/api/admin/organizations?search=${encodeURIComponent(search)}&status=${status}`).then(r => r.json()),
  })

  const suspendMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "suspend" | "unsuspend" }) =>
      apiFetch(`/api/admin/organizations/${id}/${action}`, { method: "POST" }).then(r => r.json()),
    onSuccess: () => { toast({ title: "Done" }); qc.invalidateQueries({ queryKey: ["admin-orgs"] }) },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-orgs"] })
  const orgs = data?.data ?? []

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Organizations</h1>
        <p className="text-muted-foreground text-sm">Manage all tenant organizations</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Loading...</div>
      ) : orgs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No organizations found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orgs.map((org: any) => (
            <Card key={org.id}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">{org.name}</span>
                      {org.is_internal && <Badge variant="secondary" className="text-xs">Internal</Badge>}
                      {org.is_suspended && <Badge variant="destructive" className="text-xs">Suspended</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{org.owner_email}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="outline" className={`text-xs ${PLAN_COLORS[org.plan] ?? ""}`}>{org.plan_name ?? org.plan}</Badge>
                      <Badge variant="outline" className={`text-xs ${STATUS_COLORS[org.subscription_status] ?? ""}`}>{org.subscription_status}</Badge>
                      <span className="text-xs text-muted-foreground">{org.member_count ?? 0} members · {org.lead_count ?? 0} leads</span>
                      {org.subscription_end_date && (
                        <span className="text-xs text-muted-foreground">
                          Expires: {format(new Date(org.subscription_end_date), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <ApproveDialog org={org} onSuccess={refresh} />
                    <GrantAddonDialog org={org} onSuccess={refresh} />
                    {org.is_suspended ? (
                      <Button size="sm" variant="outline" onClick={() => suspendMutation.mutate({ id: org.id, action: "unsuspend" })}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />Restore
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => suspendMutation.mutate({ id: org.id, action: "suspend" })}>
                        <Ban className="h-3.5 w-3.5 mr-1" />Suspend
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
