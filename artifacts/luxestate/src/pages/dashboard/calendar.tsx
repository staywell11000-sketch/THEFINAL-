import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  Phone,
  Video,
  Home,
  Circle,
  MoreHorizontal,
  Bell,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Link2,
  Pencil,
  Trash2,
  ListFilter,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  useAppointments,
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment,
  type Appointment,
  type CreateAppointmentInput,
} from "@/lib/appointments-api"
import { useLeads } from "@/lib/leads-api"
import { useDeals } from "@/lib/deals-api"
import { useAuth } from "@/lib/auth-context"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const DURATION_OPTIONS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
  { value: "120", label: "2 hours" },
  { value: "180", label: "3 hours" },
]

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function toLocalDateTimeInput(dateStr: string): string {
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type AppointmentFormState = {
  title: string
  description: string
  dateTime: string
  duration: string
  location: string
  leadId: string
  dealId: string
}

const EMPTY_FORM: AppointmentFormState = {
  title: "",
  description: "",
  dateTime: "",
  duration: "60",
  location: "",
  leadId: "",
  dealId: "",
}

function appointmentToForm(a: Appointment): AppointmentFormState {
  return {
    title: a.title,
    description: a.description ?? "",
    dateTime: toLocalDateTimeInput(a.dateTime),
    duration: String(a.duration),
    location: a.location ?? "",
    leadId: a.leadId ? String(a.leadId) : "",
    dealId: a.dealId ? String(a.dealId) : "",
  }
}

function AppointmentFormDialog({
  open,
  onClose,
  initial,
  appointmentId,
  defaultDate,
}: {
  open: boolean
  onClose: () => void
  initial?: Appointment
  appointmentId?: number
  defaultDate?: string
}) {
  const { toast } = useToast()
  const createMutation = useCreateAppointment()
  const updateMutation = useUpdateAppointment()
  const { data: leads = [] } = useLeads()
  const { data: deals = [] } = useDeals()

  const defaultForm: AppointmentFormState = initial
    ? appointmentToForm(initial)
    : defaultDate
    ? { ...EMPTY_FORM, dateTime: defaultDate }
    : EMPTY_FORM

  const [form, setForm] = useState<AppointmentFormState>(defaultForm)

  const set = (key: keyof AppointmentFormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const isEditing = !!appointmentId

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.dateTime) {
      toast({ title: "Title and date/time are required", variant: "destructive" })
      return
    }

    const payload: CreateAppointmentInput = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      dateTime: new Date(form.dateTime).toISOString(),
      duration: parseInt(form.duration, 10),
      location: form.location.trim() || undefined,
      leadId: form.leadId ? parseInt(form.leadId, 10) : null,
      dealId: form.dealId ? parseInt(form.dealId, 10) : null,
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: appointmentId, updates: payload })
        toast({ title: "Appointment updated" })
      } else {
        await createMutation.mutateAsync(payload)
        toast({ title: "Appointment created" })
      }
      onClose()
    } catch (err: any) {
      toast({ title: err?.message ?? "Something went wrong", variant: "destructive" })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Appointment" : "Add Appointment"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the appointment details below." : "Fill in the details to schedule a new appointment."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="apt-title">Title *</Label>
            <Input
              id="apt-title"
              placeholder="Property viewing, call with client..."
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="apt-datetime">Date & Time *</Label>
              <Input
                id="apt-datetime"
                type="datetime-local"
                value={form.dateTime}
                onChange={(e) => set("dateTime", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Duration</Label>
              <Select value={form.duration} onValueChange={(v) => set("duration", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apt-location">Location</Label>
            <Input
              id="apt-location"
              placeholder="Address or video call link"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Link to Lead</Label>
              <Select
                value={form.leadId || "__none__"}
                onValueChange={(v) => set("leadId", v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {leads.map((l: any) => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Link to Deal</Label>
              <Select
                value={form.dealId || "__none__"}
                onValueChange={(v) => set("dealId", v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {deals.map((d: any) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apt-desc">Notes</Label>
            <Textarea
              id="apt-desc"
              placeholder="Any details or preparation notes..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AppointmentCard({
  appointment,
  onEdit,
  onDelete,
}: {
  appointment: Appointment
  onEdit: (a: Appointment) => void
  onDelete: (a: Appointment) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-xl border border-border/50 bg-card/60 p-4 backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{appointment.title}</p>
          <div className="mt-1.5 space-y-0.5">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 flex-shrink-0" />
              {formatTime(appointment.dateTime)} · {formatDuration(appointment.duration)}
            </p>
            {appointment.location && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{appointment.location}</span>
              </p>
            )}
            {appointment.leadName && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="h-3 w-3 flex-shrink-0" />
                {appointment.leadName}
              </p>
            )}
            {appointment.dealTitle && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Link2 className="h-3 w-3 flex-shrink-0" />
                {appointment.dealTitle}
              </p>
            )}
          </div>
          {appointment.description && (
            <p className="mt-2 rounded-lg bg-secondary/40 px-2.5 py-1.5 text-xs text-muted-foreground">
              {appointment.description}
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass">
            <DropdownMenuItem onClick={() => onEdit(appointment)}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(appointment)}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  )
}

export default function CalendarPage() {
  const { user } = useAuth()
  const now = new Date()
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<number>(now.getDate())
  const [formOpen, setFormOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | undefined>()
  const [deletingAppointment, setDeletingAppointment] = useState<Appointment | undefined>()
  const [view, setView] = useState<"calendar" | "list">("calendar")

  const { toast } = useToast()
  const deleteMutation = useDeleteAppointment()

  const { data: appointments = [], isLoading } = useAppointments(currentMonth, currentYear)

  const isViewingToday =
    currentYear === now.getFullYear() && currentMonth === now.getMonth()

  const daysInMonth = useMemo(
    () => new Date(currentYear, currentMonth + 1, 0).getDate(),
    [currentYear, currentMonth]
  )

  const startDayOfWeek = useMemo(
    () => new Date(currentYear, currentMonth, 1).getDay(),
    [currentYear, currentMonth]
  )

  const calendarGrid = useMemo(() => {
    const cells: (number | null)[] = []
    for (let i = 0; i < startDayOfWeek; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [startDayOfWeek, daysInMonth])

  const monthLabel = `${MONTH_NAMES[currentMonth]} ${currentYear}`

  const goToPrevMonth = () => {
    setSelectedDay(1)
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1) }
    else setCurrentMonth((m) => m - 1)
  }
  const goToNextMonth = () => {
    setSelectedDay(1)
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1) }
    else setCurrentMonth((m) => m + 1)
  }
  const goToPrevYear = () => { setCurrentYear((y) => y - 1); setSelectedDay(1) }
  const goToNextYear = () => { setCurrentYear((y) => y + 1); setSelectedDay(1) }
  const goToToday = () => {
    setCurrentYear(now.getFullYear())
    setCurrentMonth(now.getMonth())
    setSelectedDay(now.getDate())
  }

  const getApptsForDay = (day: number) =>
    appointments.filter((a) => new Date(a.dateTime).getDate() === day)

  const dayAppointments = useMemo(
    () =>
      getApptsForDay(selectedDay).sort(
        (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
      ),
    [appointments, selectedDay]
  )

  const allSorted = useMemo(
    () => [...appointments].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()),
    [appointments]
  )

  const selectedDayLabel =
    isViewingToday && selectedDay === now.getDate()
      ? "Today"
      : `${MONTH_NAMES[currentMonth]} ${selectedDay}`

  const defaultDateForDay = useMemo(() => {
    if (!selectedDay) return ""
    const d = new Date(currentYear, currentMonth, selectedDay, 9, 0)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`
  }, [selectedDay, currentMonth, currentYear])

  const handleEdit = (a: Appointment) => {
    setEditingAppointment(a)
    setFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingAppointment) return
    try {
      await deleteMutation.mutateAsync(deletingAppointment.id)
      toast({ title: "Appointment deleted" })
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" })
    } finally {
      setDeletingAppointment(undefined)
    }
  }

  const handleFormClose = () => {
    setFormOpen(false)
    setEditingAppointment(undefined)
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Calendar & Appointments"
        description="Manage viewings, meetings, calls and closings in one place."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border/50 p-0.5">
              <Button
                variant={view === "calendar" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setView("calendar")}
              >
                <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                Month
              </Button>
              <Button
                variant={view === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setView("list")}
              >
                <ListFilter className="mr-1.5 h-3.5 w-3.5" />
                List
              </Button>
            </div>
            <Button
              className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
              onClick={() => { setEditingAppointment(undefined); setFormOpen(true) }}
            >
              <Plus className="h-4 w-4" />
              Add Appointment
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "This Month", value: appointments.length, sub: monthLabel, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
          { label: "Today", value: isViewingToday ? getApptsForDay(now.getDate()).length : 0, sub: "appointments", color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "This Week", value: appointments.filter((a) => {
            const d = new Date(a.dateTime)
            const startOfWeek = new Date(now)
            startOfWeek.setDate(now.getDate() - now.getDay())
            startOfWeek.setHours(0, 0, 0, 0)
            const endOfWeek = new Date(startOfWeek)
            endOfWeek.setDate(startOfWeek.getDate() + 6)
            endOfWeek.setHours(23, 59, 59, 999)
            return d >= startOfWeek && d <= endOfWeek
          }).length, sub: "appointments", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
          { label: "Linked to Leads", value: appointments.filter((a) => a.leadId).length, sub: "this month", color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={cn("glass-card border p-5", stat.bg)}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <CalendarDays className={cn("h-4 w-4", stat.color)} />
            </div>
            {isLoading ? (
              <Loader2 className="mt-1 h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <p className="mt-1 text-3xl font-bold text-foreground">{stat.value}</p>
            )}
            <p className="text-xs text-muted-foreground">{stat.sub}</p>
          </motion.div>
        ))}
      </div>

      {view === "calendar" ? (
        <div className="grid gap-6 xl:grid-cols-3">
          {/* Calendar grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="xl:col-span-2 glass-card p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="min-w-0 truncate text-lg font-semibold text-foreground">
                {monthLabel}
              </h3>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrevYear} title="Previous year">
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrevMonth} title="Previous month">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="border-border/50 px-3" onClick={goToToday}>
                  Today
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextMonth} title="Next month">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextYear} title="Next year">
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1">
              {DAYS_OF_WEEK.map((d) => (
                <div key={d} className="py-1 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentYear}-${currentMonth}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="grid grid-cols-7 gap-1"
              >
                {calendarGrid.map((day, i) => {
                  const dayAppts = day ? getApptsForDay(day) : []
                  const isToday = isViewingToday && day === now.getDate()
                  const isSelected = day === selectedDay

                  return (
                    <button
                      key={i}
                      onClick={() => day && setSelectedDay(day)}
                      disabled={!day}
                      className={cn(
                        "relative flex min-h-[56px] flex-col rounded-xl p-1.5 text-left transition-all",
                        !day && "cursor-default",
                        day && "hover:bg-secondary/30",
                        isSelected && "bg-primary/10 ring-1 ring-primary/30",
                        isToday && !isSelected && "ring-1 ring-border"
                      )}
                    >
                      {day && (
                        <>
                          <span className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium",
                            isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                          )}>
                            {day}
                          </span>
                          {isLoading ? null : dayAppts.length > 0 && (
                            <div className="mt-1 flex flex-col gap-0.5">
                              {dayAppts.slice(0, 2).map((a) => (
                                <div
                                  key={a.id}
                                  className="truncate rounded bg-primary/10 px-1 py-0.5 text-xs leading-tight text-primary"
                                >
                                  {a.title.split(" ")[0]}
                                </div>
                              ))}
                              {dayAppts.length > 2 && (
                                <span className="text-xs text-muted-foreground">+{dayAppts.length - 2}</span>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </button>
                  )
                })}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Day agenda */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{selectedDayLabel}</h3>
                <p className="text-sm text-muted-foreground">
                  {isLoading
                    ? "Loading..."
                    : dayAppointments.length === 0
                    ? "No appointments"
                    : `${dayAppointments.length} appointment${dayAppointments.length > 1 ? "s" : ""}`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => { setEditingAppointment(undefined); setFormOpen(true) }}
              >
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>

            <AnimatePresence mode="popLayout">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : dayAppointments.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 py-10"
                >
                  <CalendarDays className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No appointments</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => { setEditingAppointment(undefined); setFormOpen(true) }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add appointment
                  </Button>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {dayAppointments.map((a) => (
                    <AppointmentCard
                      key={a.id}
                      appointment={a}
                      onEdit={handleEdit}
                      onDelete={setDeletingAppointment}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      ) : (
        /* List view */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">All Appointments</h3>
              <p className="text-sm text-muted-foreground">{monthLabel} · {appointments.length} total</p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="px-3 text-xs" onClick={goToToday}>Today</Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : allSorted.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 py-16">
              <CalendarDays className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-muted-foreground">No appointments this month</p>
              <Button
                className="gap-2 bg-primary hover:bg-primary/90"
                onClick={() => { setEditingAppointment(undefined); setFormOpen(true) }}
              >
                <Plus className="h-4 w-4" />
                Add Appointment
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {allSorted.map((a, i) => {
                const d = new Date(a.dateTime)
                const isToday =
                  d.getDate() === now.getDate() &&
                  d.getMonth() === now.getMonth() &&
                  d.getFullYear() === now.getFullYear()
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-start gap-4 rounded-xl border border-border/40 bg-secondary/20 p-4"
                  >
                    <div className="flex w-14 flex-col items-center flex-shrink-0 rounded-lg border border-border/50 bg-card/60 py-2 text-center">
                      <span className="text-xs uppercase text-muted-foreground">
                        {MONTH_NAMES[d.getMonth()].slice(0, 3)}
                      </span>
                      <span className={cn(
                        "text-xl font-bold leading-none",
                        isToday ? "text-primary" : "text-foreground"
                      )}>
                        {d.getDate()}
                      </span>
                      {isToday && <span className="mt-0.5 text-[9px] font-semibold uppercase text-primary">Today</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{a.title}</p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatTime(a.dateTime)} · {formatDuration(a.duration)}
                        </p>
                        {a.location && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {a.location}
                          </p>
                        )}
                        {a.leadName && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            {a.leadName}
                          </p>
                        )}
                        {a.dealTitle && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Link2 className="h-3 w-3" />
                            {a.dealTitle}
                          </p>
                        )}
                      </div>
                      {a.description && (
                        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-1">{a.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(a)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeletingAppointment(a)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Add / Edit dialog */}
      {formOpen && (
        <AppointmentFormDialog
          open={formOpen}
          onClose={handleFormClose}
          initial={editingAppointment}
          appointmentId={editingAppointment?.id}
          defaultDate={!editingAppointment ? defaultDateForDay : undefined}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingAppointment}
        onOpenChange={(v) => !v && setDeletingAppointment(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deletingAppointment?.title}" will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
