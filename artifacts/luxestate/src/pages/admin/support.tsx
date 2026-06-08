import { useState, useRef, useEffect } from "react"
import { useAdminTickets, useAdminTicket, useAdminReply, useAdminUpdateStatus, STATUS_LABELS, STATUS_COLORS, type TicketStatus } from "@/lib/support-api"
import { cn } from "@/lib/utils"
import { Send, Loader2, MessageCircle, ChevronRight, HelpCircle, Filter, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useQueryClient } from "@tanstack/react-query"

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all",              label: "All Tickets" },
  { value: "open",             label: "Open" },
  { value: "in_progress",      label: "In Progress" },
  { value: "waiting_customer", label: "Waiting for Customer" },
  { value: "resolved",         label: "Resolved" },
  { value: "closed",           label: "Closed" },
]

function ConversationPanel({ ticketId }: { ticketId: number }) {
  const { data, isFetching } = useAdminTicket(ticketId)
  const [text, setText] = useState("")
  const reply = useAdminReply(ticketId)
  const updateStatus = useAdminUpdateStatus(ticketId)
  const bottomRef = useRef<HTMLDivElement>(null)
  const ticket = data?.ticket
  const messages: any[] = data?.messages ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  const send = async () => {
    const msg = text.trim()
    if (!msg) return
    setText("")
    await reply.mutateAsync(msg)
  }

  if (!ticket) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>

  return (
    <div className="flex flex-col h-full">
      {/* Ticket header */}
      <div className="p-4 border-b bg-card flex items-start justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm truncate">{ticket.subject}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", STATUS_COLORS[ticket.status as TicketStatus])}>
              {STATUS_LABELS[ticket.status as TicketStatus]}
            </span>
            <span className="text-xs text-muted-foreground">
              {ticket.org_name ?? "No org"} · {ticket.first_name} {ticket.last_name} &lt;{ticket.user_email}&gt;
            </span>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          <Select value={ticket.status} onValueChange={v => updateStatus.mutate(v as TicketStatus)}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.slice(1).map(s => (
                <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => {
          const isSupport = msg.sender_type === "support"
          return (
            <div key={msg.id} className={cn("flex gap-3", isSupport ? "flex-row-reverse" : "flex-row")}>
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                isSupport ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              )}>
                {isSupport ? "SA" : `${(msg.first_name?.[0] ?? "")}${(msg.last_name?.[0] ?? "")}`}
              </div>
              <div className={cn("max-w-[72%] space-y-1", isSupport ? "items-end" : "items-start", "flex flex-col")}>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground">
                    {isSupport ? "Support Team" : `${msg.first_name ?? ""} ${msg.last_name ?? ""}`.trim() || msg.email}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(msg.created_at), "MMM d, h:mm a")}</span>
                </div>
                <div className={cn("rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  isSupport
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-secondary text-foreground rounded-tl-none"
                )}>
                  <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      {!["resolved", "closed"].includes(ticket.status) ? (
        <div className="p-4 border-t bg-card flex gap-3 items-end shrink-0">
          <textarea
            className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
            placeholder="Reply as Support Team..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
            rows={2}
          />
          <Button onClick={send} disabled={!text.trim() || reply.isPending} size="sm" className="h-10">
            {reply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      ) : (
        <div className="p-4 border-t text-xs text-center text-muted-foreground">
          This ticket is {ticket.status}.
        </div>
      )}
    </div>
  )
}

export default function AdminSupport() {
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const { data, isFetching } = useAdminTickets(statusFilter)
  const qc = useQueryClient()
  const tickets: any[] = data?.data ?? []

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* Ticket list */}
      <div className="w-80 shrink-0 border-r flex flex-col bg-card">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Support Tickets</h2>
            <button onClick={() => qc.invalidateQueries({ queryKey: ["admin-support-tickets"] })} className="text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            </button>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-full">
              <Filter className="h-3 w-3 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
              <MessageCircle className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-sm">No tickets</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {tickets.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors",
                    selectedId === t.id && "bg-accent"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs font-medium truncate flex-1">{t.subject}</p>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full border", STATUS_COLORS[t.status as TicketStatus])}>
                      {STATUS_LABELS[t.status as TicketStatus]}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate">{t.org_name ?? "No org"}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {t.first_name} {t.last_name} · {format(new Date(t.updated_at), "MMM d, h:mm a")}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Conversation panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedId ? (
          <ConversationPanel ticketId={selectedId} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center">
              <HelpCircle className="h-8 w-8 opacity-40" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">No ticket selected</p>
              <p className="text-sm mt-1">Select a ticket from the left to view the conversation</p>
            </div>
            <div className="mt-4 rounded-xl border border-border bg-card px-5 py-4 max-w-sm">
              <p className="text-xs text-muted-foreground leading-relaxed text-center">
                🔒 <strong className="text-foreground">Privacy Protected.</strong> You can only view organization data if the org admin has explicitly enabled support access in their Privacy settings.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
