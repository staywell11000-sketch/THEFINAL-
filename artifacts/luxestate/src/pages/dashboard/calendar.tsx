import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type EventType = "viewing" | "meeting" | "call" | "closing"

type CalEvent = {
  id: number
  title: string
  type: EventType
  time: string
  duration: string
  location?: string
  lead?: string
  agent: string
  day: number
  notes?: string
}

const eventTypeConfig: Record<EventType, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  viewing: { label: "Viewing", color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20", icon: Home },
  meeting: { label: "Meeting", color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20", icon: Video },
  call: { label: "Call", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", icon: Phone },
  closing: { label: "Closing", color: "text-primary", bg: "bg-primary/10 border-primary/20", icon: CalendarDays },
}

const events: CalEvent[] = [
  { id: 1, title: "Penthouse Evening Viewing", type: "viewing", time: "7:00 PM", duration: "1.5h", location: "432 Park Ave, NY", lead: "Sarah Mitchell", agent: "James Donovan", day: 29, notes: "Private showing. Bring HOA documents." },
  { id: 2, title: "Beverly Hills Tour", type: "viewing", time: "2:00 PM", duration: "2h", location: "1234 Sunset Blvd, LA", lead: "Michael Chen", agent: "Sarah Mitchell", day: 30, notes: "Investor tour — emphasize ROI potential." },
  { id: 3, title: "Emily Rodriguez — Qualification Call", type: "call", time: "10:00 AM", duration: "30m", lead: "Emily Rodriguez", agent: "Michael Chen", day: 29 },
  { id: 4, title: "Team Weekly Standup", type: "meeting", time: "9:00 AM", duration: "45m", agent: "James Donovan", day: 1 },
  { id: 5, title: "Manhattan Contract Signing", type: "closing", time: "3:00 PM", duration: "1h", location: "LuxeState HQ", lead: "Sarah Mitchell", agent: "James Donovan", day: 10, notes: "HOA review complete. Seller confirmed." },
  { id: 6, title: "Dubai Villa Virtual Tour", type: "viewing", time: "11:00 AM", duration: "1h", lead: "Robert Chang", agent: "Sarah Mitchell", day: 15 },
  { id: 7, title: "Q2 Performance Review", type: "meeting", time: "2:00 PM", duration: "1h", agent: "James Donovan", day: 5 },
  { id: 8, title: "David Park — Initial Call", type: "call", time: "4:00 PM", duration: "20m", lead: "David Park", agent: "Emily Rodriguez", day: 18 },
  { id: 9, title: "Malibu Deal — Final Walkthrough", type: "viewing", time: "11:00 AM", duration: "1h", location: "21456 PCH, Malibu", lead: "Amanda Foster", agent: "James Donovan", day: 22 },
  { id: 10, title: "Beverly Hills Closing", type: "closing", time: "10:00 AM", duration: "2h", location: "LuxeState HQ", lead: "Michael Chen", agent: "Sarah Mitchell", day: 7 },
]

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const TODAY = { year: 2026, month: 4, day: 28 }

export default function CalendarPage() {
  const [currentYear, setCurrentYear] = useState(TODAY.year)
  const [currentMonth, setCurrentMonth] = useState(TODAY.month)
  const [selectedDay, setSelectedDay] = useState<number>(TODAY.day)

  const isViewingToday = currentYear === TODAY.year && currentMonth === TODAY.month

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
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const goToNextMonth = () => {
    setSelectedDay(1)
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  const goToPrevYear = () => {
    setCurrentYear((y) => y - 1)
    setSelectedDay(1)
  }

  const goToNextYear = () => {
    setCurrentYear((y) => y + 1)
    setSelectedDay(1)
  }

  const goToToday = () => {
    setCurrentYear(TODAY.year)
    setCurrentMonth(TODAY.month)
    setSelectedDay(TODAY.day)
  }

  const getEventsForDay = (day: number) =>
    events.filter((e) => e.day === day && day <= daysInMonth)

  const dayEvents = getEventsForDay(selectedDay)

  const validEvents = events.filter((e) => e.day <= daysInMonth)

  const eventTypeCounts = (Object.keys(eventTypeConfig) as EventType[]).reduce<Record<string, number>>(
    (acc, k) => {
      acc[k] = validEvents.filter((e) => e.type === k).length
      return acc
    },
    {}
  )

  const selectedDayLabel = isViewingToday && selectedDay === TODAY.day
    ? "Today"
    : `${MONTH_NAMES[currentMonth]} ${selectedDay}`

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Calendar & Appointments"
        description="Manage viewings, meetings, calls and closings in one place."
        actions={
          <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
            <Plus className="h-4 w-4" />
            Add Appointment
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(Object.keys(eventTypeConfig) as EventType[]).map((type, i) => {
          const cfg = eventTypeConfig[type]
          return (
            <motion.div
              key={type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={cn("glass-card border p-5", cfg.bg)}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{cfg.label}s</p>
                <cfg.icon className={cn("h-4 w-4", cfg.color)} />
              </div>
              <p className="mt-1 text-3xl font-bold text-foreground">{eventTypeCounts[type]}</p>
              <p className="text-xs text-muted-foreground">{monthLabel}</p>
            </motion.div>
          )
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Calendar grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="xl:col-span-2 glass-card p-6"
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="min-w-0 truncate text-lg font-semibold text-foreground">
              {monthLabel}
            </h3>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={goToPrevYear}
                title="Previous year"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={goToPrevMonth}
                title="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-border/50 px-3"
                onClick={goToToday}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={goToNextMonth}
                title="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={goToNextYear}
                title="Next year"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Day headers */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {DAYS_OF_WEEK.map((d) => (
              <div
                key={d}
                className="py-1 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
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
                const dayEvts = day ? getEventsForDay(day) : []
                const isToday = isViewingToday && day === TODAY.day
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
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium",
                            isToday
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground"
                          )}
                        >
                          {day}
                        </span>
                        {dayEvts.length > 0 && (
                          <div className="mt-1 flex flex-col gap-0.5">
                            {dayEvts.slice(0, 2).map((evt) => {
                              const cfg = eventTypeConfig[evt.type]
                              return (
                                <div
                                  key={evt.id}
                                  className={cn(
                                    "truncate rounded px-1 py-0.5 text-xs leading-tight",
                                    cfg.bg,
                                    cfg.color
                                  )}
                                >
                                  {evt.title.split(" ")[0]}
                                </div>
                              )
                            })}
                            {dayEvts.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{dayEvts.length - 2}
                              </span>
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

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3 border-t border-border/50 pt-4">
            {(Object.keys(eventTypeConfig) as EventType[]).map((type) => {
              const cfg = eventTypeConfig[type]
              return (
                <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Circle className={cn("h-3 w-3 fill-current", cfg.color)} />
                  {cfg.label}
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Day agenda */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="mb-4">
            <h3 className="font-semibold text-foreground">{selectedDayLabel}</h3>
            <p className="text-sm text-muted-foreground">
              {dayEvents.length === 0
                ? "No appointments"
                : `${dayEvents.length} appointment${dayEvents.length > 1 ? "s" : ""}`}
            </p>
          </div>

          <AnimatePresence mode="popLayout">
            {dayEvents.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 py-10"
              >
                <CalendarDays className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No appointments</p>
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="h-3.5 w-3.5" />
                  Add appointment
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {dayEvents.map((evt) => {
                  const cfg = eventTypeConfig[evt.type]
                  return (
                    <motion.div
                      key={evt.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className={cn("rounded-xl border p-4", cfg.bg)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <cfg.icon className={cn("mt-0.5 h-4 w-4 flex-shrink-0", cfg.color)} />
                          <div>
                            <p className="font-semibold text-foreground">{evt.title}</p>
                            <div className="mt-1 space-y-0.5">
                              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {evt.time} · {evt.duration}
                              </p>
                              {evt.location && (
                                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {evt.location}
                                </p>
                              )}
                              {evt.lead && (
                                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <User className="h-3 w-3" />
                                  {evt.lead}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={cn("mt-2 text-xs", cfg.bg, cfg.color)}
                            >
                              {cfg.label}
                            </Badge>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass">
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Reschedule</DropdownMenuItem>
                            <DropdownMenuItem>Set reminder</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Cancel</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {evt.notes && (
                        <p className="mt-3 rounded-lg bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                          {evt.notes}
                        </p>
                      )}
                      <div className="mt-3 flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 text-xs">
                          <Bell className="mr-1.5 h-3 w-3" />
                          Remind
                        </Button>
                        <Button size="sm" className="flex-1 bg-primary text-xs hover:bg-primary/90">
                          View details
                        </Button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Upcoming appointments */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Appointments This Month</h3>
            <p className="text-sm text-muted-foreground">Full schedule for {monthLabel}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...validEvents]
            .sort((a, b) => a.day - b.day)
            .map((evt, i) => {
              const cfg = eventTypeConfig[evt.type]
              return (
                <motion.div
                  key={evt.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-start gap-3 rounded-xl border border-border/40 bg-secondary/20 p-3"
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border",
                      cfg.bg
                    )}
                  >
                    <cfg.icon className={cn("h-4 w-4", cfg.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{evt.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {MONTH_NAMES[currentMonth]} {evt.day} · {evt.time}
                    </p>
                    {evt.lead && (
                      <p className="truncate text-xs text-muted-foreground">{evt.lead}</p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("flex-shrink-0 text-xs", cfg.bg, cfg.color)}
                  >
                    {cfg.label}
                  </Badge>
                </motion.div>
              )
            })}
        </div>
      </motion.div>
    </div>
  )
}
