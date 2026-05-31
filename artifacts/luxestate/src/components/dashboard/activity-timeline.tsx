import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Phone,
  Mail,
  MessageCircle,
  CalendarPlus,
  FileText,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Loader2,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { surfaceInputClass } from "@/lib/ui-classes"
import { useActivities, useCreateActivity, useDeleteActivity } from "@/lib/activities-api"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

const ACTIVITY_TYPES = [
  { value: "call", label: "Call", Icon: Phone, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { value: "email", label: "Email", Icon: Mail, color: "text-purple-500", bg: "bg-purple-500/10" },
  { value: "message", label: "Message", Icon: MessageCircle, color: "text-blue-500", bg: "bg-blue-500/10" },
  { value: "meeting", label: "Meeting", Icon: CalendarPlus, color: "text-primary", bg: "bg-primary/10" },
  { value: "note", label: "Note", Icon: FileText, color: "text-amber-500", bg: "bg-amber-500/10" },
  { value: "task", label: "Task", Icon: CheckCircle2, color: "text-rose-500", bg: "bg-rose-500/10" },
]

function getActivityStyle(type: string) {
  return (
    ACTIVITY_TYPES.find((t) => t.value === type) ?? {
      Icon: User,
      color: "text-muted-foreground",
      bg: "bg-secondary/50",
    }
  )
}

export function ActivityTimeline({ leadId }: { leadId: number }) {
  const { user } = useAuth()
  const { data: acts = [], isLoading } = useActivities(leadId)
  const createActivity = useCreateActivity()
  const deleteActivity = useDeleteActivity()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    type: "call",
    title: "",
    description: "",
    outcome: "",
  })

  const handleSubmit = async () => {
    if (!form.title.trim()) return
    if (!user?.id) {
      toast.error("Not authenticated")
      return
    }
    try {
      await createActivity.mutateAsync({
        userId: user.id,
        leadId,
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        outcome: form.outcome.trim() || undefined,
        completedAt: new Date().toISOString(),
      })
      setForm({ type: "call", title: "", description: "", outcome: "" })
      setShowForm(false)
      toast.success("Activity logged")
    } catch {
      toast.error("Failed to log activity")
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteActivity.mutateAsync(id)
      toast.success("Activity removed")
    } catch {
      toast.error("Failed to remove activity")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Activity Log ({acts.length})
        </p>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-border/50 text-xs"
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus className="h-3.5 w-3.5" />
          Log Activity
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <p className="text-xs font-semibold text-primary">Log New Activity</p>

              <div className="flex flex-wrap gap-1.5">
                {ACTIVITY_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                    className={cn(
                      "flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all",
                      form.type === t.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    <t.Icon className="h-3 w-3" />
                    {t.label}
                  </button>
                ))}
              </div>

              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="What happened? (e.g. Called client, discussed pricing)"
                className={cn("text-sm", surfaceInputClass)}
              />
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Details (optional)"
                className={cn("text-sm", surfaceInputClass)}
              />
              <Input
                value={form.outcome}
                onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))}
                placeholder="Outcome (optional, e.g. Scheduled viewing for next week)"
                className={cn("text-sm", surfaceInputClass)}
              />

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 gap-1.5"
                  onClick={handleSubmit}
                  disabled={!form.title.trim() || createActivity.isPending}
                >
                  {createActivity.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {acts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Clock className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No activities yet.</p>
          <p className="text-xs text-muted-foreground/60">Log a call, email, or meeting above.</p>
        </div>
      ) : (
        <div className="relative space-y-0">
          {acts.map((act, i) => {
            const { Icon, color, bg } = getActivityStyle(act.type)
            return (
              <motion.div
                key={act.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="relative flex gap-4 pb-5 last:pb-0 group"
              >
                {i < acts.length - 1 && (
                  <div className="absolute left-4 top-9 bottom-0 w-px bg-border/50" />
                )}
                <div
                  className={cn(
                    "relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-border/40",
                    bg
                  )}
                >
                  <Icon className={cn("h-4 w-4", color)} />
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground text-sm">{act.title}</p>
                      {act.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{act.description}</p>
                      )}
                      {act.outcome && (
                        <p className="mt-1 text-xs text-emerald-600 font-medium">
                          → {act.outcome}
                        </p>
                      )}
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground/60">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                        <span className="mx-1">·</span>
                        <span className="capitalize">{act.type}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(act.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
