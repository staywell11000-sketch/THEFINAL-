import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, MapPin, Bed, Bath, Maximize2, Car, Calendar, Eye, TrendingUp,
  MessageSquare, User, Tag, FileText, ChevronDown, Pencil, Star,
  Droplets, Home, Clock, BarChart2, Bookmark, ExternalLink,
  Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { cn } from "@/lib/utils"
import { surfaceSelectClass } from "@/lib/ui-classes"
import {
  Property, PropertyStatus, STATUS_CONFIG, STATUS_LIST, formatPrice, formatSqft,
} from "@/components/dashboard/properties-data"

type Tab = "overview" | "analytics" | "owner" | "notes"

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "analytics", label: "Analytics", icon: BarChart2 },
  { id: "owner", label: "Ownership", icon: User },
  { id: "notes", label: "Notes", icon: FileText },
]

export function PropertyDetailModal({
  property,
  open,
  onClose,
  onEdit,
  onStatusChange,
}: {
  property: Property | null
  open: boolean
  onClose: () => void
  onEdit: () => void
  onStatusChange: (id: string, status: PropertyStatus) => void
}) {
  const [tab, setTab] = useState<Tab>("overview")
  const [imgErr, setImgErr] = useState(false)

  if (!property) return null
  const sc = STATUS_CONFIG[property.status]

  const chartData = property.priceHistory.map((p) => ({
    date: p.date,
    price: p.price / 1_000_000,
  }))

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          {/* Slide-in panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col bg-card shadow-2xl border-l border-border/40"
          >
            {/* Image banner */}
            <div className="relative h-52 shrink-0 overflow-hidden">
              {!imgErr && property.image ? (
                <img
                  src={property.image}
                  alt={property.title}
                  onError={() => setImgErr(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-secondary/40">
                  <Building2 className="h-16 w-16 text-muted-foreground/20" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* Controls */}
              <div className="absolute right-3 top-3 flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8 bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Featured badge */}
              {property.featured && (
                <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                  <Star className="h-3 w-3 fill-white" /> Featured
                </div>
              )}

              {/* Title overlay */}
              <div className="absolute bottom-3 left-4 right-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white leading-tight">{property.title}</h2>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-white/70">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {property.address}, {property.city}, {property.state}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-2xl font-bold text-white">{formatPrice(property.price)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status + quick actions */}
            <div className="flex items-center gap-3 border-b border-border/30 px-4 py-3">
              <div className="relative">
                <select
                  value={property.status}
                  onChange={(e) => onStatusChange(property.id, e.target.value as PropertyStatus)}
                  className={cn(surfaceSelectClass, "h-7 w-36 text-xs pr-7", sc.className)}
                  onClick={(e) => e.stopPropagation()}
                >
                  {STATUS_LIST.map((s) => (
                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              </div>
              <Badge variant="outline" className="text-[10px] border-border/40 text-muted-foreground">
                {property.category}
              </Badge>
              <span className={cn("ml-auto text-xs font-medium",
                property.daysOnMarket > 120 ? "text-rose-400" : property.daysOnMarket > 60 ? "text-amber-400" : "text-muted-foreground"
              )}>
                {property.daysOnMarket}d on market
              </span>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border/30 bg-secondary/10 shrink-0">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-medium transition-colors",
                    tab === t.id
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="p-5"
                >
                  {tab === "overview" && (
                    <div className="flex flex-col gap-5">
                      {/* Specs grid */}
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {[
                          { icon: Bed, label: "Beds", value: property.beds },
                          { icon: Bath, label: "Baths", value: property.baths },
                          { icon: Maximize2, label: "Interior", value: `${formatSqft(property.sqft)} sf` },
                          { icon: Car, label: "Garage", value: property.garage || "—" },
                        ].map((s) => (
                          <div key={s.label} className="flex flex-col items-center gap-1 rounded-xl border border-border/30 bg-secondary/10 py-3">
                            <s.icon className="h-4 w-4 text-muted-foreground" />
                            <p className="text-base font-bold text-foreground tabular-nums">{s.value}</p>
                            <p className="text-[10px] text-muted-foreground">{s.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Meta row */}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Built {property.yearBuilt}</span>
                        {property.lotSqft && <span className="flex items-center gap-1"><Maximize2 className="h-3 w-3" /> {formatSqft(property.lotSqft)} sf lot</span>}
                        {property.pool && <span className="flex items-center gap-1 text-sky-400"><Droplets className="h-3 w-3" /> Pool</span>}
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Listed {property.listedAt}</span>
                      </div>

                      {/* Description */}
                      {property.description && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Description</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">{property.description}</p>
                        </div>
                      )}

                      {/* Features */}
                      {property.features.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Key Features</p>
                          <div className="flex flex-wrap gap-1.5">
                            {property.features.map((f) => (
                              <Badge key={f} variant="outline" className="text-[10px] border-border/40 text-muted-foreground">
                                <Tag className="mr-1 h-2.5 w-2.5" />{f}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Agent */}
                      <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-secondary/10 p-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                          {property.agent.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold">{property.agent}</p>
                          <p className="text-[10px] text-muted-foreground">Listing Agent</p>
                        </div>
                        <Button variant="outline" size="sm" className="h-7 text-xs border-border/50" onClick={onEdit}>
                          <MessageSquare className="mr-1.5 h-3 w-3" /> Contact
                        </Button>
                      </div>
                    </div>
                  )}

                  {tab === "analytics" && (
                    <div className="flex flex-col gap-5">
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "Views", value: property.analytics.views, icon: Eye, color: "text-sky-400", bg: "bg-sky-500/10" },
                          { label: "Inquiries", value: property.analytics.inquiries, icon: MessageSquare, color: "text-indigo-400", bg: "bg-indigo-500/10" },
                          { label: "Saves", value: property.analytics.saves, icon: Bookmark, color: "text-rose-400", bg: "bg-rose-500/10" },
                        ].map((s) => (
                          <div key={s.label} className="flex flex-col items-center gap-1.5 rounded-xl border border-border/30 bg-secondary/10 py-4">
                            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", s.bg)}>
                              <s.icon className={cn("h-4 w-4", s.color)} />
                            </div>
                            <p className="text-xl font-bold tabular-nums text-foreground">{s.value}</p>
                            <p className="text-[10px] text-muted-foreground">{s.label}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <TrendingUp className={cn("h-4 w-4", property.analytics.trend.startsWith("+") ? "text-emerald-400" : "text-rose-400")} />
                        <span className={cn("text-sm font-semibold", property.analytics.trend.startsWith("+") ? "text-emerald-400" : "text-rose-400")}>
                          {property.analytics.trend}
                        </span>
                        <span className="text-xs text-muted-foreground">engagement trend this month</span>
                      </div>

                      {/* Price history chart */}
                      {chartData.length > 1 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Price History</p>
                          <div className="h-40">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chartData} barSize={24}>
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                                <YAxis
                                  axisLine={false} tickLine={false}
                                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                  tickFormatter={(v) => `$${v}M`}
                                  domain={["auto", "auto"]}
                                  width={40}
                                />
                                <Tooltip
                                  formatter={(v: number) => [`$${v.toFixed(1)}M`, "Price"]}
                                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                                />
                                <Bar dataKey="price" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} fillOpacity={0.85} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {tab === "owner" && (
                    <div className="flex flex-col gap-4">
                      <div className="rounded-xl border border-border/30 bg-secondary/10 p-4">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/60 text-sm font-bold">
                            {property.owner.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{property.owner.name}</p>
                            <p className="text-[10px] text-muted-foreground">Property Owner</p>
                          </div>
                        </div>
                        <div className="grid gap-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-xs">Phone</span>
                            <a href={`tel:${property.owner.phone}`} className="text-xs text-primary hover:underline">{property.owner.phone || "—"}</a>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-xs">Email</span>
                            <a href={`mailto:${property.owner.email}`} className="text-xs text-primary hover:underline truncate max-w-[180px]">{property.owner.email || "—"}</a>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-xs">Property Value</span>
                            <span className="text-xs font-semibold text-foreground">{formatPrice(property.price)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/30 bg-secondary/10 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Listing Details</p>
                        <div className="grid gap-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Listed</span>
                            <span className="font-medium">{property.listedAt}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Last Updated</span>
                            <span className="font-medium">{property.updatedAt}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Days on Market</span>
                            <span className={cn("font-semibold",
                              property.daysOnMarket > 120 ? "text-rose-400" : property.daysOnMarket > 60 ? "text-amber-400" : "text-foreground"
                            )}>{property.daysOnMarket}d</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Assigned Agent</span>
                            <span className="font-medium">{property.agent}</span>
                          </div>
                        </div>
                      </div>

                      <Button variant="outline" className="w-full gap-2 border-border/50 text-sm" onClick={onEdit}>
                        <ExternalLink className="h-3.5 w-3.5" /> Edit Ownership Details
                      </Button>
                    </div>
                  )}

                  {tab === "notes" && (
                    <div className="flex flex-col gap-4">
                      <div className="rounded-xl border border-border/30 bg-secondary/10 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Internal Notes</p>
                        {property.notes ? (
                          <p className="text-sm text-muted-foreground leading-relaxed">{property.notes}</p>
                        ) : (
                          <div className="flex flex-col items-center gap-3 py-6 text-center">
                            <FileText className="h-8 w-8 text-muted-foreground/20" />
                            <p className="text-xs text-muted-foreground">No notes added yet</p>
                          </div>
                        )}
                      </div>
                      <Button variant="outline" className="w-full gap-2 border-border/50 text-sm" onClick={onEdit}>
                        <Pencil className="h-3.5 w-3.5" /> Edit Notes
                      </Button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer actions */}
            <div className="shrink-0 border-t border-border/30 p-4">
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-1.5 border-border/50 text-sm" onClick={onClose}>
                  <X className="h-3.5 w-3.5" /> Close
                </Button>
                <Button className="flex-1 gap-1.5 bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20 text-sm" onClick={onEdit}>
                  <Pencil className="h-3.5 w-3.5" /> Edit Property
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
