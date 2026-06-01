import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, Building2, Check, ChevronDown, Upload,
  Bed, Bath, Maximize2, Car, Droplets, Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { surfaceInputClass, surfaceSelectClass } from "@/lib/ui-classes"
import {
  Property, PropertyStatus, PropertyCategory,
  CATEGORY_LIST, STATUS_LIST, STATUS_CONFIG, AGENTS, formatPrice,
} from "@/components/dashboard/properties-data"
import { uploadPropertyImage } from "@/lib/properties-api"

type FormData = {
  title: string; address: string; city: string; state: string; country: string
  price: string; beds: string; baths: string; sqft: string; lotSqft: string
  yearBuilt: string; garage: string; pool: boolean
  category: PropertyCategory; status: PropertyStatus; featured: boolean
  description: string; features: string
  ownerName: string; ownerPhone: string; ownerEmail: string
  agent: string; notes: string; image: string
}

const EMPTY_FORM: FormData = {
  title: "", address: "", city: "", state: "", country: "USA",
  price: "", beds: "", baths: "", sqft: "", lotSqft: "",
  yearBuilt: new Date().getFullYear().toString(), garage: "0", pool: false,
  category: "Villa", status: "active", featured: false,
  description: "", features: "",
  ownerName: "", ownerPhone: "", ownerEmail: "",
  agent: AGENTS[0], notes: "", image: "",
}

function propertyToForm(p: Property): FormData {
  return {
    title: p.title, address: p.address, city: p.city, state: p.state, country: p.country,
    price: String(p.price / 1_000_000), beds: String(p.beds), baths: String(p.baths),
    sqft: String(p.sqft), lotSqft: p.lotSqft ? String(p.lotSqft) : "",
    yearBuilt: String(p.yearBuilt), garage: String(p.garage), pool: p.pool,
    category: p.category, status: p.status, featured: p.featured,
    description: p.description, features: p.features.join(", "),
    ownerName: p.owner.name, ownerPhone: p.owner.phone, ownerEmail: p.owner.email,
    agent: p.agent, notes: p.notes, image: p.image,
  }
}

function formToProperty(f: FormData, existing?: Property): Property {
  const features = f.features.split(",").map((s) => s.trim()).filter(Boolean)
  const now = new Date().toISOString().slice(0, 10)
  const priceMillion = parseFloat(f.price) || 0
  const price = Math.round(priceMillion * 1_000_000)

  return {
    id: existing?.id ?? `p${Date.now()}`,
    title: f.title,
    address: f.address, city: f.city, state: f.state, country: f.country,
    price,
    beds: parseInt(f.beds) || 0,
    baths: parseInt(f.baths) || 0,
    sqft: parseInt(f.sqft) || 0,
    lotSqft: f.lotSqft ? parseInt(f.lotSqft) : null,
    yearBuilt: parseInt(f.yearBuilt) || 2024,
    garage: parseInt(f.garage) || 0,
    pool: f.pool,
    category: f.category,
    status: f.status,
    featured: f.featured,
    image: f.image || `https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop`,
    description: f.description,
    features,
    owner: { name: f.ownerName, phone: f.ownerPhone, email: f.ownerEmail },
    agent: f.agent,
    analytics: existing?.analytics ?? { views: 0, inquiries: 0, saves: 0, trend: "0%" },
    listedAt: existing?.listedAt ?? now,
    updatedAt: now,
    daysOnMarket: existing?.daysOnMarket ?? 0,
    priceHistory: existing?.priceHistory ?? [{ date: now.slice(0, 7), price }],
    notes: f.notes,
  }
}

type Step = "basics" | "specs" | "owner" | "media"

const STEPS: { id: Step; label: string }[] = [
  { id: "basics", label: "Basics" },
  { id: "specs", label: "Specs" },
  { id: "owner", label: "Ownership" },
  { id: "media", label: "Media & Notes" },
]

// ── Field helpers ─────────────────────────────────────────────────────────
function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn("h-9 w-full rounded-md border px-3 text-sm placeholder:text-muted-foreground/40", surfaceInputClass)}
    />
  )
}

function Select({ value, onChange, options, className }: {
  value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
  className?: string
}) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(surfaceSelectClass, "h-9 text-sm", className)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

// ── Image uploader ────────────────────────────────────────────────────────
function ImageUploader({ url, onChange }: { url: string; onChange: (v: string) => void }) {
  const [err, setErr] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const hasImage = url && !err

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { setUploadError("Please select an image file"); return }
    if (file.size > 10 * 1024 * 1024) { setUploadError("Image must be under 10 MB"); return }
    setUploading(true)
    setUploadError("")
    try {
      const imageUrl = await uploadPropertyImage(file)
      onChange(imageUrl)
      setErr(false)
    } catch {
      setUploadError("Upload failed — try a URL instead")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "relative flex h-44 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-border/50 transition-colors",
          !hasImage && "bg-secondary/20 hover:bg-secondary/30"
        )}
        onClick={() => !hasImage && fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Uploading…</p>
          </div>
        ) : hasImage ? (
          <>
            <img src={url} alt="" onError={() => setErr(true)} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}
                className="rounded-full bg-white/20 backdrop-blur-sm px-3 py-1.5 text-xs text-white font-medium flex items-center gap-1"
              >
                <Upload className="h-3 w-3" /> Replace
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange(""); setErr(false) }}
                className="rounded-full bg-white/20 backdrop-blur-sm p-1.5 text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/40">
              <Upload className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Click or drag to upload</p>
              <p className="text-[10px] text-muted-foreground/60">PNG, JPG, WebP — max 10 MB</p>
            </div>
          </div>
        )}
      </div>
      {uploadError && <p className="text-[10px] text-destructive">{uploadError}</p>}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border/40" />
        <span className="text-[10px] text-muted-foreground/60">or paste URL</span>
        <div className="h-px flex-1 bg-border/40" />
      </div>
      <TextInput value={url} onChange={(v) => { setErr(false); onChange(v) }} placeholder="https://example.com/property.jpg" />
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────
export function PropertyFormModal({
  open, onClose, onSave, existing, isSaving,
}: {
  open: boolean
  onClose: () => void
  onSave: (p: Property) => void | Promise<void>
  existing?: Property | null
  isSaving?: boolean
}) {
  const isEdit = !!existing
  const [step, setStep] = useState<Step>("basics")
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  useEffect(() => {
    if (open) {
      setForm(existing ? propertyToForm(existing) : EMPTY_FORM)
      setStep("basics")
      setErrors({})
    }
  }, [open, existing])

  const set = (key: keyof FormData) => (val: string | boolean) =>
    setForm((f) => ({ ...f, [key]: val }))

  const validate = (): boolean => {
    const e: typeof errors = {}
    if (!form.title.trim()) e.title = "Required"
    if (!form.address.trim()) e.address = "Required"
    if (!form.city.trim()) e.city = "Required"
    if (!form.price || isNaN(Number(form.price))) e.price = "Required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) { setStep("basics"); return }
    await onSave(formToProperty(form, existing ?? undefined))
  }

  const stepIdx = STEPS.findIndex((s) => s.id === step)
  const isFirst = stepIdx === 0
  const isLast = stepIdx === STEPS.length - 1

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border/40 px-6 py-4">
          <div>
            <DialogTitle className="text-base font-semibold">
              {isEdit ? "Edit Property" : "Add New Property"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit ? `Editing: ${existing?.title}` : "Fill in the property details below"}
            </p>
          </div>
          {isEdit && (
            <Badge className={cn("text-[10px]", STATUS_CONFIG[form.status].className)}>
              {STATUS_CONFIG[form.status].label}
            </Badge>
          )}
        </DialogHeader>

        {/* Step tabs */}
        <div className="flex border-b border-border/40 bg-secondary/10">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors",
                step === s.id
                  ? "border-b-2 border-primary text-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold",
                step === s.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              )}>{i + 1}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15 }}
            >
              {step === "basics" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Property Title *" className="sm:col-span-2">
                    <TextInput value={form.title} onChange={set("title")} placeholder="e.g. Manhattan Penthouse" />
                    {errors.title && <p className="text-[10px] text-destructive">{errors.title}</p>}
                  </Field>
                  <Field label="Street Address *" className="sm:col-span-2">
                    <TextInput value={form.address} onChange={set("address")} placeholder="e.g. 432 Park Avenue" />
                    {errors.address && <p className="text-[10px] text-destructive">{errors.address}</p>}
                  </Field>
                  <Field label="City *">
                    <TextInput value={form.city} onChange={set("city")} placeholder="New York" />
                    {errors.city && <p className="text-[10px] text-destructive">{errors.city}</p>}
                  </Field>
                  <Field label="State">
                    <TextInput value={form.state} onChange={set("state")} placeholder="NY" />
                  </Field>
                  <Field label="Category">
                    <Select value={form.category} onChange={set("category")} options={CATEGORY_LIST.map((c) => ({ value: c, label: c }))} />
                  </Field>
                  <Field label="Status">
                    <Select value={form.status} onChange={set("status")} options={STATUS_LIST.map((s) => ({ value: s, label: STATUS_CONFIG[s].label }))} />
                  </Field>
                  <Field label="Price ($ millions) *" className="sm:col-span-1">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <input
                        type="number"
                        step="0.1"
                        value={form.price}
                        onChange={(e) => set("price")(e.target.value)}
                        placeholder="12.5"
                        className={cn("h-9 w-full rounded-md border pl-7 pr-3 text-sm", surfaceInputClass)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">M</span>
                    </div>
                    {form.price && !isNaN(Number(form.price)) && (
                      <p className="text-[10px] text-muted-foreground">{formatPrice(parseFloat(form.price) * 1_000_000)}</p>
                    )}
                    {errors.price && <p className="text-[10px] text-destructive">{errors.price}</p>}
                  </Field>
                  <Field label="Assigned Agent">
                    <Select value={form.agent} onChange={set("agent")} options={[{ value: "", label: "— Not Assigned —" }, ...AGENTS.map((a) => ({ value: a, label: a }))]} />
                  </Field>
                  <Field label="Description" className="sm:col-span-2">
                    <textarea
                      value={form.description}
                      onChange={(e) => set("description")(e.target.value)}
                      rows={3}
                      placeholder="Brief description of the property…"
                      className={cn("w-full rounded-md border p-3 text-sm resize-none placeholder:text-muted-foreground/40", surfaceInputClass)}
                    />
                  </Field>
                  <label className="flex cursor-pointer items-center gap-3 sm:col-span-2">
                    <div
                      onClick={() => set("featured")(!form.featured)}
                      className={cn("relative flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer", form.featured ? "bg-primary" : "bg-secondary/60")}
                    >
                      <span className={cn("absolute h-3.5 w-3.5 rounded-full bg-white shadow transition-all", form.featured ? "left-[18px]" : "left-[3px]")} />
                    </div>
                    <div>
                      <p className="text-xs font-medium">Featured listing</p>
                      <p className="text-[10px] text-muted-foreground">Highlighted in portfolio views</p>
                    </div>
                  </label>
                </div>
              )}

              {step === "specs" && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Bedrooms">
                    <div className="relative flex items-center">
                      <Bed className="absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
                      <input type="number" min="0" value={form.beds} onChange={(e) => set("beds")(e.target.value)}
                        className={cn("h-9 w-full rounded-md border pl-9 pr-3 text-sm", surfaceInputClass)} />
                    </div>
                  </Field>
                  <Field label="Bathrooms">
                    <div className="relative flex items-center">
                      <Bath className="absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
                      <input type="number" min="0" value={form.baths} onChange={(e) => set("baths")(e.target.value)}
                        className={cn("h-9 w-full rounded-md border pl-9 pr-3 text-sm", surfaceInputClass)} />
                    </div>
                  </Field>
                  <Field label="Interior sqft">
                    <div className="relative flex items-center">
                      <Maximize2 className="absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
                      <input type="number" min="0" value={form.sqft} onChange={(e) => set("sqft")(e.target.value)}
                        placeholder="6200"
                        className={cn("h-9 w-full rounded-md border pl-9 pr-3 text-sm", surfaceInputClass)} />
                    </div>
                  </Field>
                  <Field label="Lot sqft">
                    <TextInput value={form.lotSqft} onChange={set("lotSqft")} placeholder="Optional" type="number" />
                  </Field>
                  <Field label="Year Built">
                    <TextInput value={form.yearBuilt} onChange={set("yearBuilt")} type="number" />
                  </Field>
                  <Field label="Garage Spaces">
                    <div className="relative flex items-center">
                      <Car className="absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
                      <input type="number" min="0" value={form.garage} onChange={(e) => set("garage")(e.target.value)}
                        className={cn("h-9 w-full rounded-md border pl-9 pr-3 text-sm", surfaceInputClass)} />
                    </div>
                  </Field>
                  <label className="flex cursor-pointer items-center gap-3 sm:col-span-3">
                    <div
                      onClick={() => set("pool")(!form.pool)}
                      className={cn("relative flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer", form.pool ? "bg-primary" : "bg-secondary/60")}
                    >
                      <span className={cn("absolute h-3.5 w-3.5 rounded-full bg-white shadow transition-all", form.pool ? "left-[18px]" : "left-[3px]")} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Droplets className="h-3.5 w-3.5 text-sky-400" />
                      <p className="text-xs font-medium">Swimming Pool</p>
                    </div>
                  </label>
                  <Field label="Key Features (comma-separated)" className="sm:col-span-3">
                    <textarea
                      value={form.features}
                      onChange={(e) => set("features")(e.target.value)}
                      rows={2}
                      placeholder="e.g. Ocean Views, Wine Cellar, Smart Home, Heated Pool"
                      className={cn("w-full rounded-md border p-3 text-sm resize-none placeholder:text-muted-foreground/40", surfaceInputClass)}
                    />
                    {form.features && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {form.features.split(",").map((f) => f.trim()).filter(Boolean).map((f) => (
                          <Badge key={f} variant="outline" className="text-[10px] border-border/40">{f}</Badge>
                        ))}
                      </div>
                    )}
                  </Field>
                </div>
              )}

              {step === "owner" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Owner / Company Name" className="sm:col-span-2">
                    <TextInput value={form.ownerName} onChange={set("ownerName")} placeholder="Harrison LLC" />
                  </Field>
                  <Field label="Owner Phone">
                    <TextInput value={form.ownerPhone} onChange={set("ownerPhone")} placeholder="+1 (212) 555-0100" type="tel" />
                  </Field>
                  <Field label="Owner Email">
                    <TextInput value={form.ownerEmail} onChange={set("ownerEmail")} placeholder="owner@example.com" type="email" />
                  </Field>
                  <div className="sm:col-span-2 rounded-xl border border-border/30 bg-secondary/10 p-4">
                    <p className="text-xs font-medium mb-3">Assigned Agent <span className="text-muted-foreground font-normal">(optional)</span></p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        onClick={() => set("agent")("")}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs transition-all",
                          !form.agent ? "border-primary/40 bg-primary/5 font-medium" : "border-border/40 hover:bg-secondary/20"
                        )}
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary/60 text-[10px] font-bold text-muted-foreground">—</div>
                        Not Assigned
                        {!form.agent && <Check className="ml-auto h-3 w-3 text-primary" />}
                      </button>
                      {AGENTS.map((a) => (
                        <button
                          key={a}
                          onClick={() => set("agent")(a)}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs transition-all",
                            form.agent === a ? "border-primary/40 bg-primary/5 font-medium" : "border-border/40 hover:bg-secondary/20"
                          )}
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                            {a.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          {a}
                          {form.agent === a && <Check className="ml-auto h-3 w-3 text-primary" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === "media" && (
                <div className="flex flex-col gap-5">
                  <Field label="Cover Image">
                    <ImageUploader url={form.image} onChange={set("image")} />
                  </Field>
                  <Field label="Internal Notes">
                    <textarea
                      value={form.notes}
                      onChange={(e) => set("notes")(e.target.value)}
                      rows={4}
                      placeholder="Internal notes visible only to your team…"
                      className={cn("w-full rounded-md border p-3 text-sm resize-none placeholder:text-muted-foreground/40", surfaceInputClass)}
                    />
                  </Field>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/40 px-6 py-4">
          <Button variant="ghost" size="sm" onClick={isFirst ? onClose : () => setStep(STEPS[stepIdx - 1].id)} className="gap-1.5">
            {isFirst ? <><X className="h-3.5 w-3.5" /> Cancel</> : <>← Back</>}
          </Button>
          <div className="flex items-center gap-2">
            {!isLast && (
              <Button size="sm" variant="outline" onClick={() => setStep(STEPS[stepIdx + 1].id)} className="gap-1.5 border-border/50">
                Next →
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5 bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20">
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {isEdit ? "Save Changes" : "Add Property"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
