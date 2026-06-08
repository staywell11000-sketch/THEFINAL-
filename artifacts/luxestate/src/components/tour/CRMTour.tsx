import { useEffect, useState, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, CheckCheck, X } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCurrentUser } from "@/lib/user-api"

type TourStep = {
  target: string
  title: string
  description: string
  emoji: string
  color: string
}

const STEPS: TourStep[] = [
  { target: "tour-dashboard",   emoji: "🏠", color: "#f59e0b", title: "Dashboard Overview",  description: "Your command center — live pipeline metrics, revenue forecasts, recent activity, and today's priorities all in one glance." },
  { target: "tour-leads",       emoji: "👥", color: "#3b82f6", title: "Leads",               description: "Capture, qualify, and nurture every prospect. Filter by source, status, or agent and track every touchpoint end-to-end." },
  { target: "tour-messages",    emoji: "💬", color: "#10b981", title: "Messages",             description: "Your unified WhatsApp inbox. Reply to leads, send media, and have every conversation logged automatically in the CRM." },
  { target: "tour-properties",  emoji: "🏢", color: "#8b5cf6", title: "Properties",           description: "Manage your full portfolio. Add listings, attach photos and floor plans, and instantly match properties to the right leads." },
  { target: "tour-dealers",     emoji: "🤝", color: "#ec4899", title: "Dealers",              description: "Track your network of dealers and brokers — active listings, commission records, and referral performance over time." },
  { target: "tour-analytics",   emoji: "📊", color: "#06b6d4", title: "Analytics",            description: "Data-driven insights on lead conversion, team performance, and revenue pipeline. Export beautiful reports in one click." },
  { target: "tour-ai",          emoji: "🧠", color: "#7c3aed", title: "AI Intelligence",      description: "Your AI co-pilot. Ask anything about a lead, get closing strategies, draft follow-ups, and surface your hottest deals." },
  { target: "tour-automations", emoji: "⚡", color: "#f97316", title: "Automations",          description: "No-code workflows on autopilot — auto-send WhatsApp, assign leads by rules, and follow up without lifting a finger." },
  { target: "tour-team",        emoji: "👨‍💼", color: "#0ea5e9", title: "Team",                 description: "Manage agents, assign roles, and track individual performance. Invite members and fine-tune access permissions per role." },
  { target: "tour-deals",       emoji: "📋", color: "#84cc16", title: "Deals",                description: "Pipeline management for every active deal. Track value, stage, and probability — spot bottlenecks before they cost you." },
  { target: "tour-documents",   emoji: "📁", color: "#f59e0b", title: "Documents",            description: "Central file storage for contracts, proposals, and property docs. Share directly with clients — no email needed." },
  { target: "tour-calendar",    emoji: "📅", color: "#ef4444", title: "Calendar",             description: "Schedule site visits, calls, and follow-ups. Your full agenda synced with your leads and team — never miss a meeting." },
  { target: "tour-settings",    emoji: "⚙️", color: "#6b7280", title: "Settings",             description: "Customize your workspace — branding, integrations, notifications, and account preferences. Make the CRM truly yours." },
]

const STORAGE_KEY_PREFIX = "lxs-tour-done-"
const PAD = 8
const CARD_W = 352
const CARD_H = 220

interface CRMTourProps {
  onExpand?: () => void
}

export function CRMTour({ onExpand }: CRMTourProps) {
  const { user } = useAuth()
  const { data: profile } = useCurrentUser(user?.id)

  const storageKey = user?.id ? `${STORAGE_KEY_PREFIX}${user.id}` : null
  const onExpandRef = useRef(onExpand)
  onExpandRef.current = onExpand

  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [cardTop, setCardTop] = useState(0)
  const [cardLeft, setCardLeft] = useState(0)
  const [arrowY, setArrowY] = useState("50%")
  const [winSize, setWinSize] = useState({ w: window.innerWidth, h: window.innerHeight })

  useEffect(() => {
    if (!profile?.onboarded || !storageKey) return
    try { if (localStorage.getItem(storageKey)) return } catch {}
    const t = setTimeout(() => { setVisible(true); onExpandRef.current?.() }, 900)
    return () => clearTimeout(t)
  }, [profile?.onboarded, storageKey])

  useEffect(() => {
    const h = () => setWinSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener("resize", h)
    return () => window.removeEventListener("resize", h)
  }, [])

  const completeTour = useCallback(() => {
    setVisible(false)
    if (storageKey) { try { localStorage.setItem(storageKey, "1") } catch {} }
  }, [storageKey])

  const measure = useCallback((s: number) => {
    const el = document.querySelector(`[data-tour="${STEPS[s]?.target}"]`)
    if (!el) {
      if (s < STEPS.length - 1) setStep(s + 1)
      else completeTour()
      return
    }
    const r = el.getBoundingClientRect()
    setRect(r)

    const vw = window.innerWidth
    const vh = window.innerHeight
    let left = r.right + 20
    let top = r.top + r.height / 2 - CARD_H / 2

    if (left + CARD_W > vw - 12) left = Math.max(12, r.left - CARD_W - 20)
    top = Math.max(12, Math.min(top, vh - CARD_H - 12))

    setCardLeft(left)
    setCardTop(top)

    // arrow vertical offset relative to card top
    const targetCenterY = r.top + r.height / 2
    const relY = targetCenterY - top
    setArrowY(`${Math.max(20, Math.min(relY, CARD_H - 20))}px`)
  }, [completeTour])

  useEffect(() => {
    if (!visible) return
    measure(step)
    const t = setTimeout(() => measure(step), 320)
    return () => clearTimeout(t)
  }, [visible, step, measure, winSize])

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else completeTour()
  }

  if (!visible) return null

  const { w, h } = winSize
  const cur = STEPS[step]
  const isLast = step === STEPS.length - 1
  const progress = (step + 1) / STEPS.length

  const arrowOnLeft = cardLeft > (rect?.right ?? 0)

  const panels = rect
    ? [
        { t: 0,               l: 0,              W: w,                              H: Math.max(0, rect.top - PAD) },
        { t: rect.top - PAD,  l: 0,              W: Math.max(0, rect.left - PAD),   H: rect.height + PAD * 2 },
        { t: rect.top - PAD,  l: rect.right + PAD, W: Math.max(0, w - rect.right - PAD), H: rect.height + PAD * 2 },
        { t: rect.bottom + PAD, l: 0,            W: w,                              H: Math.max(0, h - rect.bottom - PAD) },
      ]
    : [{ t: 0, l: 0, W: w, H: h }]

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9980, pointerEvents: "none" }}>

      {/* ── Backdrop panels ── */}
      {panels.map((p, i) => (
        <div
          key={i}
          style={{
            position: "fixed",
            background: "rgba(2,6,12,0.72)",
            backdropFilter: "blur(1.5px)",
            WebkitBackdropFilter: "blur(1.5px)",
            top: p.t, left: p.l, width: p.W, height: p.H,
            pointerEvents: "all",
          }}
        />
      ))}

      {/* ── Spotlight ring with pulse ── */}
      {rect && (
        <motion.div
          key={`ring-${step}`}
          initial={{ opacity: 0, scale: 0.82 }}
          animate={{
            opacity: 1,
            scale: 1,
            boxShadow: [
              `0 0 0 2px ${cur.color}, 0 0 0 5px ${cur.color}44, 0 0 28px 6px ${cur.color}28`,
              `0 0 0 2px ${cur.color}, 0 0 0 10px ${cur.color}18, 0 0 44px 14px ${cur.color}10`,
              `0 0 0 2px ${cur.color}, 0 0 0 5px ${cur.color}44, 0 0 28px 6px ${cur.color}28`,
            ],
          }}
          transition={{
            opacity: { duration: 0.25 },
            scale: { type: "spring", stiffness: 300, damping: 22 },
            boxShadow: { duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.3 },
          }}
          style={{
            position: "fixed",
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            borderRadius: 12,
            pointerEvents: "none",
            zIndex: 9982,
          }}
        />
      )}

      {/* ── Tooltip card ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`card-${step}`}
          initial={{ opacity: 0, x: arrowOnLeft ? 8 : -8, scale: 0.94 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: arrowOnLeft ? -8 : 8, scale: 0.94 }}
          transition={{ type: "spring", stiffness: 450, damping: 32 }}
          style={{
            position: "fixed",
            top: cardTop,
            left: cardLeft,
            width: CARD_W,
            zIndex: 9990,
            pointerEvents: "all",
          }}
        >
          {/* Arrow caret pointing toward the spotlight */}
          {arrowOnLeft ? (
            <div
              style={{
                position: "absolute",
                left: -9,
                top: arrowY,
                transform: "translateY(-50%)",
                width: 0,
                height: 0,
                borderTop: "9px solid transparent",
                borderBottom: "9px solid transparent",
                borderRight: "9px solid hsl(var(--card))",
                zIndex: 1,
                filter: "drop-shadow(-2px 0 2px rgba(0,0,0,0.15))",
              }}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                right: -9,
                top: arrowY,
                transform: "translateY(-50%)",
                width: 0,
                height: 0,
                borderTop: "9px solid transparent",
                borderBottom: "9px solid transparent",
                borderLeft: "9px solid hsl(var(--card))",
                zIndex: 1,
                filter: "drop-shadow(2px 0 2px rgba(0,0,0,0.15))",
              }}
            />
          )}

          {/* Card */}
          <div
            style={{
              borderRadius: 16,
              overflow: "hidden",
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border) / 0.5)",
              boxShadow: "0 24px 64px -8px rgba(0,0,0,0.55), 0 4px 16px -2px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04)",
            }}
          >
            {/* Accent stripe */}
            <div
              style={{
                height: 3,
                background: `linear-gradient(90deg, ${cur.color}, ${cur.color}88)`,
              }}
            />

            <div style={{ padding: "18px 20px 18px" }}>
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                  {/* Emoji badge */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: `${cur.color}1a`,
                      border: `1.5px solid ${cur.color}33`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      flexShrink: 0,
                    }}
                  >
                    {cur.emoji}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: cur.color,
                          opacity: 0.9,
                        }}
                      >
                        {step + 1} / {STEPS.length}
                      </span>
                      {/* Step dots mini-track */}
                      <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                        {STEPS.map((_, i) => (
                          <div
                            key={i}
                            style={{
                              width: i === step ? 12 : 4,
                              height: 3,
                              borderRadius: 99,
                              background: i <= step ? cur.color : "hsl(var(--muted-foreground) / 0.25)",
                              transition: "all 0.3s ease",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <h3
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "hsl(var(--foreground))",
                        lineHeight: 1.2,
                        margin: 0,
                      }}
                    >
                      {cur.title}
                    </h3>
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={completeTour}
                  aria-label="Close tour"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "hsl(var(--muted-foreground))",
                    flexShrink: 0,
                    marginLeft: 8,
                    transition: "background 0.15s, color 0.15s",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "hsl(var(--secondary))"
                    ;(e.currentTarget as HTMLElement).style.color = "hsl(var(--foreground))"
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = "transparent"
                    ;(e.currentTarget as HTMLElement).style.color = "hsl(var(--muted-foreground))"
                  }}
                >
                  <X style={{ width: 13, height: 13 }} />
                </button>
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: 13.5,
                  color: "hsl(var(--muted-foreground))",
                  lineHeight: 1.65,
                  margin: 0,
                  marginBottom: 16,
                }}
              >
                {cur.description}
              </p>

              {/* Progress bar */}
              <div
                style={{
                  height: 3,
                  borderRadius: 99,
                  background: "hsl(var(--muted) / 0.5)",
                  overflow: "hidden",
                  marginBottom: 16,
                }}
              >
                <motion.div
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                  style={{
                    height: "100%",
                    borderRadius: 99,
                    background: `linear-gradient(90deg, ${cur.color}, ${cur.color}cc)`,
                  }}
                />
              </div>

              {/* Action row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <button
                  onClick={completeTour}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12.5,
                    color: "hsl(var(--muted-foreground))",
                    padding: "6px 0",
                    fontWeight: 500,
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "hsl(var(--foreground))" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "hsl(var(--muted-foreground))" }}
                >
                  Skip tour
                </button>

                <button
                  onClick={handleNext}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    paddingLeft: 18,
                    paddingRight: 18,
                    paddingTop: 8,
                    paddingBottom: 8,
                    borderRadius: 9,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#fff",
                    background: cur.color,
                    boxShadow: `0 4px 14px -2px ${cur.color}66`,
                    transition: "opacity 0.15s, transform 0.15s, box-shadow 0.15s",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.opacity = "0.88"
                    ;(e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"
                    ;(e.currentTarget as HTMLElement).style.boxShadow = `0 8px 20px -2px ${cur.color}88`
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.opacity = "1"
                    ;(e.currentTarget as HTMLElement).style.transform = "translateY(0)"
                    ;(e.currentTarget as HTMLElement).style.boxShadow = `0 4px 14px -2px ${cur.color}66`
                  }}
                >
                  {isLast ? (
                    <>
                      <CheckCheck style={{ width: 14, height: 14 }} />
                      Finish tour
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight style={{ width: 14, height: 14 }} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  )
}
