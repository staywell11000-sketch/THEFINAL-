import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageCircle, X, ChevronLeft, Send, Plus, Loader2, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  useTickets, useTicket, useCreateTicket, useSendMessage,
  STATUS_LABELS, STATUS_COLORS, type TicketStatus,
} from "@/lib/support-api"
import { format } from "date-fns"

const FAQS = [
  { q: "How do I add a new lead?", a: "Go to Leads → click 'Add Lead' button in the top right." },
  { q: "How do I connect WhatsApp?", a: "Go to Settings → Connected Accounts → click Connect on WhatsApp." },
  { q: "How do I export my data?", a: "Go to Settings → Privacy & Security → Data Export section." },
  { q: "How do I invite team members?", a: "Go to Settings → Business → Team Management section." },
]

function Avatar({ name, isSupport, className }: { name: string; isSupport?: boolean; className?: string }) {
  if (isSupport) return (
    <div className={cn("h-7 w-7 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0", className)}>
      <HelpCircle className="h-3.5 w-3.5 text-primary-foreground" />
    </div>
  )
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "U"
  return (
    <div className={cn("h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0 text-[10px] font-bold text-muted-foreground", className)}>
      {initials}
    </div>
  )
}

function NewTicketForm({ onSuccess }: { onSuccess: () => void }) {
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const create = useCreateTicket()

  const submit = async () => {
    if (!subject.trim() || !message.trim()) return
    const res = await create.mutateAsync({ subject: subject.trim(), message: message.trim() })
    if (!res.error) onSuccess()
  }

  return (
    <div className="flex flex-col h-full">
      <p className="text-xs text-muted-foreground mb-3 px-4">Describe your issue and our support team will respond shortly.</p>
      <div className="flex-1 overflow-y-auto px-4 space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Subject</label>
          <input
            className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            placeholder="Brief description of your issue"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            maxLength={200}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Message</label>
          <textarea
            className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
            placeholder="Tell us what's happening in detail..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={5}
          />
        </div>
        <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            🔒 Your business data remains private. Support staff cannot access your leads, conversations, or customer information unless you explicitly enable support access in Privacy settings.
          </p>
        </div>
      </div>
      <div className="px-4 pb-4 pt-3 border-t border-border mt-2">
        <button
          onClick={submit}
          disabled={!subject.trim() || !message.trim() || create.isPending}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send Message
        </button>
      </div>
    </div>
  )
}

function TicketConversation({ ticketId, onBack }: { ticketId: number; onBack: () => void }) {
  const { data, isFetching } = useTicket(ticketId)
  const [text, setText] = useState("")
  const send = useSendMessage(ticketId)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [data?.messages?.length])

  const ticket = data?.ticket
  const messages: any[] = data?.messages ?? []

  const submit = async () => {
    const msg = text.trim()
    if (!msg) return
    setText("")
    await send.mutateAsync(msg)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pb-3 border-b border-border flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{ticket?.subject ?? "..."}</p>
          {ticket && (
            <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border mt-0.5", STATUS_COLORS[ticket.status as TicketStatus])}>
              {STATUS_LABELS[ticket.status as TicketStatus]}
            </span>
          )}
        </div>
        {isFetching && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0 mt-1" />}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map(msg => {
          const isSupport = msg.sender_type === "support"
          return (
            <div key={msg.id} className={cn("flex gap-2", isSupport ? "flex-row" : "flex-row-reverse")}>
              <Avatar name={isSupport ? "Support" : `${msg.first_name ?? ""} ${msg.last_name ?? ""}`.trim()} isSupport={isSupport} />
              <div className={cn("max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                isSupport
                  ? "bg-secondary text-foreground rounded-tl-none"
                  : "bg-primary text-primary-foreground rounded-tr-none"
              )}>
                <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                <p className={cn("text-[10px] mt-1 opacity-70", isSupport ? "text-left" : "text-right")}>
                  {format(new Date(msg.created_at), "MMM d, h:mm a")}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {ticket && !["resolved", "closed"].includes(ticket.status) ? (
        <div className="px-3 pb-3 pt-2 border-t border-border flex gap-2 items-end">
          <textarea
            className="flex-1 rounded-xl border border-border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none min-h-[40px] max-h-[100px]"
            placeholder="Type a reply..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit() } }}
            rows={1}
          />
          <button
            onClick={submit}
            disabled={!text.trim() || send.isPending}
            className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center disabled:opacity-50 hover:bg-primary/90 transition-colors shrink-0"
          >
            {send.isPending ? <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" /> : <Send className="h-4 w-4 text-primary-foreground" />}
          </button>
        </div>
      ) : (
        <div className="px-4 pb-3 pt-2 text-xs text-center text-muted-foreground border-t border-border">
          This ticket has been {ticket?.status}.
        </div>
      )}
    </div>
  )
}

export function SupportChatWidget() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<"list" | "new" | "ticket">("list")
  const [activeTicketId, setActiveTicketId] = useState<number | null>(null)
  const [showFaq, setShowFaq] = useState(false)
  const { data } = useTickets()
  const tickets: any[] = data?.data ?? []
  const openCount = tickets.filter(t => ["open", "in_progress", "waiting_customer"].includes(t.status)).length

  const openTicket = (id: number) => { setActiveTicketId(id); setView("ticket") }
  const goBack = () => { setView("list"); setActiveTicketId(null) }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-[360px] rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 flex flex-col overflow-hidden"
            style={{ height: 520 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground shrink-0">
              <div className="flex items-center gap-2">
                {view !== "list" && (
                  <button onClick={goBack} className="mr-1 opacity-80 hover:opacity-100 transition-opacity">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
                <div className="h-7 w-7 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <HelpCircle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">
                    {view === "new" ? "New Support Ticket" : view === "ticket" ? "Ticket" : "Support Center"}
                  </p>
                  <p className="text-[10px] opacity-70 leading-tight">Typically responds within a few hours</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="opacity-70 hover:opacity-100 transition-opacity">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {view === "new" ? (
                <NewTicketForm onSuccess={() => setView("list")} />
              ) : view === "ticket" && activeTicketId ? (
                <TicketConversation ticketId={activeTicketId} onBack={goBack} />
              ) : (
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="flex-1 overflow-y-auto">
                    {/* Trust message */}
                    <div className="mx-4 mt-3 rounded-xl bg-muted/50 border border-border/50 p-3">
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        🔒 <strong className="text-foreground">Your data is private.</strong> Support staff cannot see your leads, conversations, or documents without your explicit permission.
                      </p>
                    </div>

                    {/* Tickets */}
                    <div className="px-4 mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-foreground">Your Tickets</p>
                        {openCount > 0 && (
                          <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">{openCount} open</span>
                        )}
                      </div>
                      {tickets.length === 0 ? (
                        <div className="text-center py-6 text-xs text-muted-foreground">
                          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p>No tickets yet. Create one below.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {tickets.slice(0, 5).map(t => (
                            <button
                              key={t.id}
                              onClick={() => openTicket(t.id)}
                              className="w-full text-left rounded-xl border border-border/60 bg-background px-3 py-2.5 hover:border-primary/40 hover:bg-secondary/30 transition-all"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-medium truncate flex-1">{t.subject}</p>
                                <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full border shrink-0 leading-tight", STATUS_COLORS[t.status as TicketStatus])}>
                                  {STATUS_LABELS[t.status as TicketStatus]}
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {t.message_count} message{t.message_count !== 1 ? "s" : ""} · {format(new Date(t.updated_at), "MMM d")}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* FAQ */}
                    <div className="px-4 mt-4 mb-3">
                      <button
                        onClick={() => setShowFaq(v => !v)}
                        className="text-xs font-semibold text-foreground flex items-center justify-between w-full mb-2"
                      >
                        <span>Frequently Asked Questions</span>
                        <span className="text-muted-foreground text-[10px]">{showFaq ? "▲" : "▼"}</span>
                      </button>
                      {showFaq && (
                        <div className="space-y-2">
                          {FAQS.map((faq, i) => (
                            <div key={i} className="rounded-xl border border-border/50 bg-muted/30 p-3">
                              <p className="text-xs font-medium text-foreground">{faq.q}</p>
                              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{faq.a}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-4 pb-4 pt-2 border-t border-border shrink-0">
                    <button
                      onClick={() => setView("new")}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      New Support Ticket
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger button */}
      <button
        onClick={() => { setOpen(v => !v); if (!open) setView("list") }}
        className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform relative"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="h-6 w-6" />
            </motion.span>
          ) : (
            <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageCircle className="h-6 w-6" />
            </motion.span>
          )}
        </AnimatePresence>
        {!open && openCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {openCount > 9 ? "9+" : openCount}
          </span>
        )}
      </button>
    </div>
  )
}
