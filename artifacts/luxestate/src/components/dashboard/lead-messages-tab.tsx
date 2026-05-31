import { useState, useEffect, useRef, useCallback } from "react"
import { Link } from "wouter"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Send,
  Loader2,
  MessageCircle,
  ExternalLink,
  StickyNote,
  CheckCheck,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { surfaceInputClass } from "@/lib/ui-classes"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import {
  type Message,
  type Conversation,
  getOrCreateConversationForLead,
  getMessages,
  sendMessage as apiSendMessage,
  formatMessageTime,
} from "@/lib/messaging-api"
import { Lead } from "@/components/dashboard/leads-types"

type Props = { lead: Lead }

export function LeadMessagesTab({ lead }: Props) {
  const { user } = useAuth()

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages]         = useState<Message[]>([])
  const [loading, setLoading]           = useState(true)
  const [msgLoading, setMsgLoading]     = useState(false)
  const [messageText, setMessageText]   = useState("")
  const [sending, setSending]           = useState(false)
  const [isNoteMode, setIsNoteMode]     = useState(false)
  const [setupError, setSetupError]     = useState(false)
  const [genericError, setGenericError] = useState("")

  const bottomRef  = useRef<HTMLDivElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // ── Load or create conversation for this lead ──────────
  const loadConversation = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setSetupError(false)
    setGenericError("")
    try {
      const conv = await getOrCreateConversationForLead(user.id, {
        id: lead.id,
        name: lead.name,
        phone: lead.phone && lead.phone !== "—" ? lead.phone : undefined,
        email: lead.email,
        property: lead.property && lead.property !== "—" ? lead.property : undefined,
      })
      setConversation(conv)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ""
      if (msg.includes("relation") || msg.includes("does not exist") || msg.includes("42P01")) {
        setSetupError(true)
      } else {
        setGenericError(msg || "Failed to load conversation")
      }
    } finally {
      setLoading(false)
    }
  }, [user, lead.id, lead.name, lead.phone, lead.email, lead.property])

  useEffect(() => { loadConversation() }, [loadConversation])

  // ── Load messages ──────────────────────────────────────
  useEffect(() => {
    if (!conversation) return
    setMsgLoading(true)
    getMessages(conversation.id)
      .then(setMessages)
      .catch(console.error)
      .finally(() => setMsgLoading(false))
  }, [conversation?.id])

  // ── Real-time subscription ─────────────────────────────
  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    if (!conversation) return

    const ch = supabase
      .channel(`lead-msgs-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const msg = payload.new as Message
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
          )
        }
      )
      .subscribe()

    channelRef.current = ch
    return () => { supabase.removeChannel(ch) }
  }, [conversation?.id])

  // ── Scroll to bottom ───────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── Send ───────────────────────────────────────────────
  const handleSend = async (text?: string) => {
    const content = (text ?? messageText).trim()
    if (!content || !conversation || !user || sending) return
    setSending(true)
    setMessageText("")
    try {
      const msg = await apiSendMessage(
        conversation.id,
        user.id,
        content,
        isNoteMode ? "note" : "text"
      )
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
      )
      setIsNoteMode(false)
    } catch (err) {
      console.error("Failed to send:", err)
    } finally {
      setSending(false)
    }
  }

  // ── Error states ───────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (setupError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Messaging tables not set up yet.
          Run <code className="rounded bg-secondary/60 px-1 text-xs">supabase-messaging-setup.sql</code> in
          your Supabase dashboard, then click retry.
        </p>
        <Button size="sm" variant="outline" onClick={loadConversation} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    )
  }

  if (genericError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-destructive">{genericError}</p>
        <Button size="sm" variant="outline" onClick={loadConversation}>Retry</Button>
      </div>
    )
  }

  // ── Main UI ────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ height: 440 }}>
      {/* Toolbar */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {messages.length} message{messages.length !== 1 ? "s" : ""}
          {conversation?.status && (
            <span className="ml-2 capitalize text-muted-foreground/60">· {conversation.status}</span>
          )}
        </p>
        {conversation && (
          <Link href={`/dashboard/messages?convId=${conversation.id}`}>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
              <ExternalLink className="h-3 w-3" />
              Open in Messages
            </Button>
          </Link>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-2 rounded-xl border border-border/40 bg-secondary/10 p-3">
        {msgLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground">
              No messages yet — start the conversation below.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex",
                  msg.type === "note"
                    ? "justify-center"
                    : msg.sender_id === user?.id
                      ? "justify-end"
                      : "justify-start"
                )}
              >
                {msg.type === "note" ? (
                  <div className="flex max-w-sm items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 text-xs text-amber-600">
                    <StickyNote className="h-3 w-3 flex-shrink-0" />
                    <span className="italic">{msg.content}</span>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "flex max-w-[75%] flex-col gap-0.5",
                      msg.sender_id === user?.id ? "items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 text-xs leading-relaxed",
                        msg.sender_id === user?.id
                          ? "rounded-tr-sm bg-primary text-primary-foreground"
                          : "rounded-tl-sm bg-secondary text-foreground"
                      )}
                    >
                      {msg.content}
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1",
                        msg.sender_id === user?.id ? "justify-end" : "justify-start"
                      )}
                    >
                      <span className="text-[10px] text-muted-foreground">
                        {formatMessageTime(msg.created_at)}
                      </span>
                      {msg.sender_id === user?.id && (
                        <CheckCheck
                          className={cn(
                            "h-3 w-3",
                            msg.status === "read" ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
            <div ref={bottomRef} />
          </AnimatePresence>
        )}
      </div>

      {/* Compose */}
      <div className="mt-3 space-y-2">
        {isNoteMode && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs text-amber-600">
            <StickyNote className="h-3 w-3 flex-shrink-0" />
            <span>Internal note — not sent to lead</span>
            <button
              onClick={() => setIsNoteMode(false)}
              className="ml-auto underline"
            >
              Cancel
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 flex-shrink-0",
              isNoteMode ? "text-amber-500" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setIsNoteMode(!isNoteMode)}
            title="Add internal note"
          >
            <StickyNote className="h-3.5 w-3.5" />
          </Button>
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={isNoteMode ? "Write an internal note…" : `Message ${lead.name}…`}
            className={cn("flex-1 h-8 text-xs", surfaceInputClass)}
            disabled={sending}
          />
          <Button
            size="icon"
            className="h-8 w-8 flex-shrink-0 shadow-md shadow-primary/20"
            onClick={() => handleSend()}
            disabled={!messageText.trim() || sending}
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
