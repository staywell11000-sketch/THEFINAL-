import { useCallback, useEffect, useRef, useState } from "react"
import {
  Upload, FileSpreadsheet, Check, AlertTriangle, X, ChevronDown,
  ChevronLeft, ChevronRight, Loader2, CheckCircle2, Info,
  FileText, SkipForward, GitMerge, Trash2, History, RefreshCw,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { surfaceInputClass, surfaceSelectClass } from "@/lib/ui-classes"
import { Lead, LeadPriority, LeadStatus } from "@/components/dashboard/leads-types"
import { pipelineOrder, statusConfig, priorityConfig, agents, allSources } from "@/components/dashboard/leads-data"
import {
  ParsedFile, ColumnMapping, ImportCandidate, FieldTarget, FIELD_LABELS,
  parseFile, detectColumnMappings, refineMappingFromSamples,
  mapRowToLead, buildCandidates, processInChunks,
} from "@/components/dashboard/lead-import-utils"
import { addImportRecord, getImportHistory, deleteImportRecord, clearImportHistory, ImportRecord } from "@/components/dashboard/lead-import-store"

// ── Types ────────────────────────────────────────────────────────────────────
type Step = "upload" | "map" | "preview" | "configure" | "importing" | "done"

type ImportConfig = {
  pipeline: LeadStatus
  assignedTo: string
  priority: LeadPriority
  defaultSource: string
  extraTags: string
  skipMissingName: boolean
}

type ImportResult = {
  imported: number
  skipped: number
  duplicates: number
  errors: number
  totalRows: number
}

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "map", label: "Map Fields" },
  { key: "preview", label: "Preview" },
  { key: "configure", label: "Configure" },
  { key: "importing", label: "Importing" },
  { key: "done", label: "Done" },
]
const PREVIEW_STEPS: Step[] = ["upload", "map", "preview", "configure"]
const STEP_INDEX: Record<Step, number> = Object.fromEntries(STEPS.map((s, i) => [s.key, i])) as Record<Step, number>

const PAGE_SIZE = 20
const FIELD_OPTIONS: FieldTarget[] = [
  "name", "firstName", "lastName", "email", "phone", "whatsapp",
  "budget", "property", "notes", "source", "assignedTo", "tags", "skip",
]

// ── Sub-components ───────────────────────────────────────────────────────────
function StepIndicator({ step }: { step: Step }) {
  const current = STEP_INDEX[step]
  const visibleSteps = PREVIEW_STEPS
  return (
    <div className="flex items-center gap-1.5 px-6 pt-2 pb-4">
      {visibleSteps.map((s, i) => {
        const idx = STEP_INDEX[s]
        const done = current > idx
        const active = current === idx
        return (
          <div key={s} className="flex items-center gap-1.5">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all",
                done && "bg-primary text-primary-foreground",
                active && "bg-primary/20 text-primary ring-2 ring-primary/40",
                !done && !active && "bg-secondary/40 text-muted-foreground"
              )}
            >
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            <span className={cn("text-xs font-medium", active ? "text-foreground" : "text-muted-foreground")}>
              {STEPS.find((st) => st.key === s)?.label}
            </span>
            {i < visibleSteps.length - 1 && (
              <div className={cn("h-px w-8 transition-colors", done ? "bg-primary/50" : "bg-border/40")} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function FileTypeIcon({ type }: { type: string }) {
  if (type === "csv") return <FileText className="h-8 w-8 text-emerald-400" />
  if (type === "xlsx" || type === "xls") return <FileSpreadsheet className="h-8 w-8 text-sky-400" />
  return <FileText className="h-8 w-8 text-muted-foreground" />
}

function DuplicateBadge({ matchType, confidence }: { matchType: string; confidence: string }) {
  const isHigh = confidence === "high"
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-[10px] font-medium px-1.5 py-0",
        isHigh ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
      )}
    >
      <AlertTriangle className="h-2.5 w-2.5" />
      {matchType === "exact_email" ? "Email match" : matchType === "exact_phone" ? "Phone match" : "Name match"}
    </Badge>
  )
}

// ── Import History Panel ─────────────────────────────────────────────────────
function ImportHistoryPanel({ onClose }: { onClose: () => void }) {
  const [history, setHistory] = useState<ImportRecord[]>(() => getImportHistory())

  const remove = (id: string) => {
    deleteImportRecord(id)
    setHistory(getImportHistory())
  }
  const clearAll = () => {
    clearImportHistory()
    setHistory([])
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Import History</h3>
          <p className="text-xs text-muted-foreground">{history.length} import{history.length !== 1 ? "s" : ""} recorded</p>
        </div>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-destructive hover:text-destructive" onClick={clearAll}>
              <Trash2 className="h-3 w-3" /> Clear all
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <History className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No imports yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
          {history.map((rec) => (
            <div key={rec.id} className="group flex items-start gap-3 rounded-lg border border-border/40 bg-secondary/20 p-3">
              <FileTypeIcon type={rec.fileType} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{rec.filename}</span>
                  <button
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => remove(rec.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(rec.importedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-[10px] font-medium text-emerald-400">{rec.imported} imported</span>
                  {rec.skipped > 0 && <><span className="text-[10px] text-muted-foreground">·</span><span className="text-[10px] text-muted-foreground">{rec.skipped} skipped</span></>}
                  {rec.duplicates > 0 && <><span className="text-[10px] text-muted-foreground">·</span><span className="text-[10px] text-amber-400">{rec.duplicates} dupes</span></>}
                  {rec.errors > 0 && <><span className="text-[10px] text-muted-foreground">·</span><span className="text-[10px] text-destructive">{rec.errors} errors</span></>}
                </div>
                <div className="mt-1 flex gap-1.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/40 text-muted-foreground">{statusConfig[rec.pipeline as LeadStatus]?.label ?? rec.pipeline}</Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/40 text-muted-foreground">{rec.assignedTo}</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function LeadImportModal({
  open,
  onClose,
  existingLeads,
  onImport,
}: {
  open: boolean
  onClose: () => void
  existingLeads: Lead[]
  onImport: (leads: Lead[]) => void
}) {
  const [step, setStep] = useState<Step>("upload")
  const [showHistory, setShowHistory] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [candidates, setCandidates] = useState<ImportCandidate[]>([])
  const [previewFilter, setPreviewFilter] = useState<"all" | "ready" | "duplicates" | "errors">("all")
  const [previewPage, setPreviewPage] = useState(0)
  const [importProgress, setImportProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [config, setConfig] = useState<ImportConfig>({
    pipeline: "new",
    assignedTo: agents[0],
    priority: "warm",
    defaultSource: "Email",
    extraTags: "",
    skipMissingName: true,
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setStep("upload")
    setShowHistory(false)
    setIsDragging(false)
    setParseError(null)
    setIsParsing(false)
    setParsedFile(null)
    setMapping({})
    setCandidates([])
    setPreviewFilter("all")
    setPreviewPage(0)
    setImportProgress(0)
    setResult(null)
    setConfig({ pipeline: "new", assignedTo: agents[0], priority: "warm", defaultSource: "Email", extraTags: "", skipMissingName: true })
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFile = useCallback(async (file: File) => {
    setParseError(null)
    setIsParsing(true)
    try {
      const parsed = await parseFile(file)
      const initial = detectColumnMappings(parsed.headers)
      const refined = refineMappingFromSamples(initial, parsed.headers, parsed.rows)
      setParsedFile(parsed)
      setMapping(refined)
      setStep("map")
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to parse file.")
    } finally {
      setIsParsing(false)
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ""
  }

  const proceedFromMap = async () => {
    if (!parsedFile) return
    const rows = parsedFile.rows
    const CHUNK = 200
    const built: ImportCandidate[] = []
    await processInChunks(
      rows,
      CHUNK,
      (chunk, offset) =>
        buildCandidates(
          chunk.map((row, i) => mapRowToLead(row, mapping, offset + i, config.defaultSource, config.assignedTo)),
          existingLeads
        ),
      () => {}
    ).then((chunks) => built.push(...chunks))

    if (config.skipMissingName) {
      built.forEach((c) => { if (!c.name.trim()) c.action = "skip" })
    }
    setCandidates(built)
    setPreviewFilter("all")
    setPreviewPage(0)
    setStep("preview")
  }

  const runImport = async () => {
    setStep("importing")
    setImportProgress(0)

    const toImport = candidates.filter((c) => c.action === "import" || c.action === "merge")
    const toSkip   = candidates.filter((c) => c.action === "skip")
    const dupes    = candidates.filter((c) => c.duplicates.length > 0)
    const errs     = candidates.filter((c) => c.errors.length > 0 && c.action === "import")

    const newLeads: Lead[] = []
    const maxId = existingLeads.reduce((m, l) => Math.max(m, l.id), 0)
    const extraTags = config.extraTags.split(",").map((t) => t.trim()).filter(Boolean)

    await processInChunks(
      toImport,
      50,
      (chunk, offset) => {
        return chunk.map((c, i): Lead => ({
          id: maxId + offset + i + 1,
          name: c.name || `Lead #${maxId + offset + i + 1}`,
          email: c.email,
          phone: c.phone,
          whatsappNumber: c.whatsappNumber || c.phone,
          property: c.property || "TBD",
          interestedProperties: c.property ? [c.property] : [],
          budget: c.budget || "TBD",
          status: config.pipeline,
          priority: config.priority,
          source: "Email",
          assignedTo: c.assignedTo || config.assignedTo,
          lastContact: new Date().toISOString().slice(0, 10),
          avatar: c.name ? c.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() : "?",
          notes: c.notes ? [c.notes] : [],
          timeline: [{ id: `t${Date.now()}_${i}`, title: "Imported via CSV/Excel", time: new Date().toISOString() }],
          score: 50,
          urgencyScore: 40,
          tags: [...new Set([...c.tags, "Imported", ...extraTags])],
          attachments: [],
          campaign: `Import — ${parsedFile?.filename ?? ""}`,
          adSource: c.source || "Import",
        }))
      },
      (done, total) => setImportProgress(Math.round((done / total) * 100))
    ).then((chunks) => newLeads.push(...chunks))

    setImportProgress(100)
    await new Promise((r) => setTimeout(r, 300))

    const importResult: ImportResult = {
      imported: newLeads.length,
      skipped: toSkip.length,
      duplicates: dupes.length,
      errors: errs.length,
      totalRows: candidates.length,
    }
    setResult(importResult)

    addImportRecord({
      filename: parsedFile?.filename ?? "unknown",
      fileType: parsedFile?.fileType ?? "other",
      importedAt: new Date().toISOString(),
      totalRows: candidates.length,
      imported: newLeads.length,
      skipped: toSkip.length,
      duplicates: dupes.length,
      errors: errs.length,
      pipeline: config.pipeline,
      assignedTo: config.assignedTo,
      tags: extraTags,
    })

    onImport(newLeads)
    setStep("done")
  }

  // ── Derived state ────────────────────────────────────────────────────────
  const filteredCandidates = candidates.filter((c) => {
    if (previewFilter === "ready")      return c.action === "import" && c.errors.length === 0
    if (previewFilter === "duplicates") return c.duplicates.length > 0
    if (previewFilter === "errors")     return c.errors.length > 0
    return true
  })
  const totalPages = Math.ceil(filteredCandidates.length / PAGE_SIZE)
  const pageItems  = filteredCandidates.slice(previewPage * PAGE_SIZE, (previewPage + 1) * PAGE_SIZE)

  const readyCount = candidates.filter((c) => c.action === "import").length
  const dupeCount  = candidates.filter((c) => c.duplicates.length > 0).length
  const errCount   = candidates.filter((c) => c.errors.length > 0).length
  const skipCount  = candidates.filter((c) => c.action === "skip").length

  const setAction = (idx: number, action: ImportCandidate["action"]) => {
    setCandidates((prev) => prev.map((c, i) => i === idx ? { ...c, action } : c))
  }
  const globalIdx = (localIdx: number) => candidates.indexOf(filteredCandidates[previewPage * PAGE_SIZE + localIdx])

  const mappedFields = Object.values(mapping).filter((f) => f !== "skip").length
  const hasName = Object.values(mapping).some((f) => f === "name" || f === "firstName")

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col">
        <DialogHeader className="shrink-0 px-6 pt-5 pb-0">
          <div className="flex items-start justify-between">
            <DialogTitle className="text-base font-semibold">
              {showHistory ? "Import History" : "Import Leads"}
            </DialogTitle>
            <button
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
              onClick={() => setShowHistory((v) => !v)}
            >
              <History className="h-3.5 w-3.5" />
              History
            </button>
          </div>
          {!showHistory && step !== "importing" && step !== "done" && <StepIndicator step={step} />}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <AnimatePresence mode="wait" initial={false}>
            {showHistory ? (
              <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="p-6">
                <ImportHistoryPanel onClose={() => setShowHistory(false)} />
              </motion.div>
            ) : step === "upload" ? (
              <motion.div key="upload" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="p-6">
                <UploadStep
                  isDragging={isDragging}
                  setIsDragging={setIsDragging}
                  isParsing={isParsing}
                  parseError={parseError}
                  fileInputRef={fileInputRef}
                  onDrop={onDrop}
                  onFileInput={onFileInput}
                />
              </motion.div>
            ) : step === "map" && parsedFile ? (
              <motion.div key="map" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="p-6">
                <MapStep
                  parsedFile={parsedFile}
                  mapping={mapping}
                  setMapping={setMapping}
                  mappedFields={mappedFields}
                  hasName={hasName}
                />
              </motion.div>
            ) : step === "preview" ? (
              <motion.div key="preview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="p-6">
                <PreviewStep
                  pageItems={pageItems}
                  filteredCandidates={filteredCandidates}
                  previewFilter={previewFilter}
                  setPreviewFilter={(f) => { setPreviewFilter(f); setPreviewPage(0) }}
                  previewPage={previewPage}
                  setPreviewPage={setPreviewPage}
                  totalPages={totalPages}
                  readyCount={readyCount}
                  dupeCount={dupeCount}
                  errCount={errCount}
                  skipCount={skipCount}
                  totalCount={candidates.length}
                  setAction={(localIdx, action) => setAction(globalIdx(localIdx), action)}
                />
              </motion.div>
            ) : step === "configure" ? (
              <motion.div key="configure" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="p-6">
                <ConfigureStep config={config} setConfig={setConfig} readyCount={readyCount} />
              </motion.div>
            ) : step === "importing" ? (
              <motion.div key="importing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="p-6">
                <ImportingStep progress={importProgress} total={candidates.filter((c) => c.action === "import").length} />
              </motion.div>
            ) : step === "done" && result ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="p-6">
                <DoneStep result={result} onClose={handleClose} onImportMore={reset} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Footer actions */}
        {!showHistory && step !== "importing" && step !== "done" && (
          <div className="shrink-0 flex items-center justify-between border-t border-border/40 px-6 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (step === "upload") handleClose()
                else if (step === "map") setStep("upload")
                else if (step === "preview") setStep("map")
                else if (step === "configure") setStep("preview")
              }}
              className="gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              {step === "upload" ? "Cancel" : "Back"}
            </Button>

            <div className="flex items-center gap-2">
              {step === "map" && (
                <span className="text-xs text-muted-foreground">
                  {mappedFields} field{mappedFields !== 1 ? "s" : ""} mapped ·{" "}
                  {(parsedFile?.totalRows ?? 0).toLocaleString()} rows
                </span>
              )}
              {step === "upload" ? null : step === "map" ? (
                <Button
                  size="sm"
                  disabled={!hasName}
                  onClick={proceedFromMap}
                  className="gap-1.5 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                  title={!hasName ? "Map at least a Name column to continue" : undefined}
                >
                  Preview Leads <ChevronRight className="h-4 w-4" />
                </Button>
              ) : step === "preview" ? (
                <Button
                  size="sm"
                  onClick={() => setStep("configure")}
                  disabled={readyCount === 0}
                  className="gap-1.5 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                >
                  Configure Import <ChevronRight className="h-4 w-4" />
                </Button>
              ) : step === "configure" ? (
                <Button
                  size="sm"
                  onClick={runImport}
                  className="gap-1.5 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                >
                  Import {readyCount} Lead{readyCount !== 1 ? "s" : ""}
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Step: Upload ─────────────────────────────────────────────────────────────
function UploadStep({
  isDragging, setIsDragging, isParsing, parseError, fileInputRef, onDrop, onFileInput,
}: {
  isDragging: boolean
  setIsDragging: (v: boolean) => void
  isParsing: boolean
  parseError: string | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onDrop: (e: React.DragEvent) => void
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-semibold">Upload your leads file</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Supported formats: CSV, Excel (.xlsx, .xls)</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 transition-all cursor-pointer",
          isDragging ? "border-primary/60 bg-primary/5" : "border-border/50 bg-secondary/10 hover:border-primary/30 hover:bg-secondary/20"
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        {isParsing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
            </div>
            <p className="text-sm font-medium">Parsing file…</p>
          </div>
        ) : (
          <>
            <div className={cn("flex h-14 w-14 items-center justify-center rounded-full transition-colors", isDragging ? "bg-primary/20" : "bg-secondary/40")}>
              <Upload className={cn("h-7 w-7 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">{isDragging ? "Drop to upload" : "Drag & drop your file here"}</p>
              <p className="mt-1 text-xs text-muted-foreground">or <span className="text-primary font-medium">browse files</span></p>
            </div>
            <div className="flex items-center gap-3">
              {[
                { icon: <FileText className="h-4 w-4 text-emerald-400" />, label: ".csv" },
                { icon: <FileSpreadsheet className="h-4 w-4 text-sky-400" />, label: ".xlsx" },
                { icon: <FileSpreadsheet className="h-4 w-4 text-sky-300" />, label: ".xls" },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 rounded-md border border-border/40 bg-secondary/30 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground">
                  {icon}
                  {label}
                </div>
              ))}
            </div>
          </>
        )}
        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFileInput} />
      </div>

      {parseError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {parseError}
        </div>
      )}

      {/* Tips */}
      <div className="rounded-lg border border-border/30 bg-secondary/10 p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Info className="h-3.5 w-3.5 text-primary/60" />
          <span className="text-xs font-semibold text-muted-foreground">Tips for best results</span>
        </div>
        <ul className="space-y-1">
          {[
            "Include column headers in the first row",
            "Name, email, and phone columns are auto-detected",
            "Large files (1,000+ rows) are processed in batches",
            "Duplicates are flagged automatically before import",
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ── Step: Map ────────────────────────────────────────────────────────────────
function MapStep({
  parsedFile, mapping, setMapping, mappedFields, hasName,
}: {
  parsedFile: ParsedFile
  mapping: ColumnMapping
  setMapping: (m: ColumnMapping) => void
  mappedFields: number
  hasName: boolean
}) {
  const sampleRows = parsedFile.rows.slice(0, 3)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold">Map your columns</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Detected <span className="text-foreground font-medium">{parsedFile.headers.length}</span> columns ·{" "}
            <span className="text-foreground font-medium">{parsedFile.totalRows.toLocaleString()}</span> data rows
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-6 items-center gap-1 rounded-full bg-primary/10 px-2.5 text-[11px] font-medium text-primary">
            <Check className="h-3 w-3" />
            {mappedFields} mapped
          </div>
          {!hasName && (
            <div className="flex h-6 items-center gap-1 rounded-full bg-amber-500/10 px-2.5 text-[11px] font-medium text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              Name required
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border/40 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/40 bg-secondary/20">
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Column Header</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Map to Field</th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sample Data</th>
            </tr>
          </thead>
          <tbody>
            {parsedFile.headers.map((header, idx) => {
              const fieldValue = mapping[idx] ?? "skip"
              const isSkipped = fieldValue === "skip"
              const samples = sampleRows.map((r) => r[idx]).filter(Boolean)

              return (
                <tr
                  key={idx}
                  className={cn(
                    "border-b border-border/30 transition-colors",
                    isSkipped ? "opacity-50 hover:opacity-70" : "hover:bg-secondary/20"
                  )}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {!isSkipped && <div className="h-1.5 w-1.5 rounded-full bg-primary/60" />}
                      <span className="font-medium text-foreground">{header || `Column ${idx + 1}`}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="relative w-44">
                      <select
                        value={fieldValue}
                        onChange={(e) => setMapping({ ...mapping, [idx]: e.target.value as FieldTarget })}
                        className={cn(surfaceSelectClass, "h-7 text-xs")}
                      >
                        {FIELD_OPTIONS.map((f) => (
                          <option key={f} value={f}>{FIELD_LABELS[f]}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      {samples.slice(0, 2).map((s, i) => (
                        <span key={i} className="truncate max-w-[200px] text-muted-foreground">{s}</span>
                      ))}
                      {samples.length === 0 && <span className="italic text-muted-foreground/50">empty</span>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5" />
        Fields marked <span className="font-medium text-foreground">— Skip —</span> will not be imported.
        A <span className="font-medium text-foreground">Name</span> column is required.
      </div>
    </div>
  )
}

// ── Step: Preview ────────────────────────────────────────────────────────────
function PreviewStep({
  pageItems, filteredCandidates, previewFilter, setPreviewFilter, previewPage, setPreviewPage,
  totalPages, readyCount, dupeCount, errCount, skipCount, totalCount, setAction,
}: {
  pageItems: ImportCandidate[]
  filteredCandidates: ImportCandidate[]
  previewFilter: "all" | "ready" | "duplicates" | "errors"
  setPreviewFilter: (f: "all" | "ready" | "duplicates" | "errors") => void
  previewPage: number
  setPreviewPage: (p: number) => void
  totalPages: number
  readyCount: number
  dupeCount: number
  errCount: number
  skipCount: number
  totalCount: number
  setAction: (idx: number, a: ImportCandidate["action"]) => void
}) {
  const tabs: { key: "all" | "ready" | "duplicates" | "errors"; label: string; count: number; color?: string }[] = [
    { key: "all", label: "All", count: totalCount },
    { key: "ready", label: "Ready", count: readyCount, color: "text-emerald-400" },
    { key: "duplicates", label: "Duplicates", count: dupeCount, color: "text-amber-400" },
    { key: "errors", label: "Errors", count: errCount, color: "text-destructive" },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold">Preview imported leads</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Review and adjust each lead before confirming</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-6 items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 text-[11px] font-medium text-emerald-400">
            <Check className="h-3 w-3" /> {readyCount} ready
          </span>
          {dupeCount > 0 && (
            <span className="flex h-6 items-center gap-1 rounded-full bg-amber-500/10 px-2.5 text-[11px] font-medium text-amber-400">
              <AlertTriangle className="h-3 w-3" /> {dupeCount} dupes
            </span>
          )}
          {skipCount > 0 && (
            <span className="flex h-6 items-center gap-1 rounded-full bg-secondary/40 px-2.5 text-[11px] font-medium text-muted-foreground">
              <SkipForward className="h-3 w-3" /> {skipCount} skip
            </span>
          )}
          {errCount > 0 && (
            <span className="flex h-6 items-center gap-1 rounded-full bg-destructive/10 px-2.5 text-[11px] font-medium text-destructive">
              <X className="h-3 w-3" /> {errCount} err
            </span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0.5 rounded-lg border border-border/40 bg-secondary/20 p-0.5 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setPreviewFilter(tab.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              previewFilter === tab.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            <span className={cn("tabular-nums", tab.color)}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-secondary/20">
                <th className="w-8 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">#</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lead</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Contact</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Details</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No leads in this filter
                  </td>
                </tr>
              ) : (
                pageItems.map((c, localIdx) => {
                  const hasDupe = c.duplicates.length > 0
                  const hasErr = c.errors.length > 0
                  const isSkipped = c.action === "skip"
                  return (
                    <tr
                      key={c.rowIndex}
                      className={cn(
                        "border-b border-border/30 transition-colors",
                        isSkipped && "opacity-40",
                        hasDupe && !isSkipped && "bg-amber-500/[0.04]",
                        hasErr && !isSkipped && "bg-destructive/[0.04]",
                        !hasDupe && !hasErr && !isSkipped && "hover:bg-secondary/10"
                      )}
                    >
                      <td className="px-3 py-2.5 text-muted-foreground">{c.rowIndex + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                            {c.name ? c.name.split(" ").map((p) => p[0]).join("").slice(0, 2) : "?"}
                          </div>
                          <span className="font-medium text-foreground truncate max-w-[120px]">{c.name || <span className="italic text-muted-foreground">unnamed</span>}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          {c.email && <span className="text-muted-foreground truncate max-w-[140px]">{c.email}</span>}
                          {c.phone && <span className="text-muted-foreground">{c.phone}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          {c.property && <span className="text-muted-foreground truncate max-w-[120px]">{c.property}</span>}
                          {c.budget && <span className="font-medium text-foreground">{c.budget}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-1">
                          {hasDupe && c.duplicates.map((d, i) => (
                            <DuplicateBadge key={i} matchType={d.matchType} confidence={d.confidence} />
                          ))}
                          {hasErr && c.errors.map((e, i) => (
                            <Badge key={i} variant="outline" className="gap-1 text-[10px] px-1.5 py-0 bg-destructive/10 text-destructive border-destructive/20">
                              <X className="h-2.5 w-2.5" />{e}
                            </Badge>
                          ))}
                          {!hasDupe && !hasErr && (
                            <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                              <Check className="h-2.5 w-2.5" />Ready
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => setAction(localIdx, "import")}
                            title="Import this lead"
                            className={cn("flex h-6 w-6 items-center justify-center rounded-md transition-colors", c.action === "import" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground")}
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          {hasDupe && (
                            <button
                              onClick={() => setAction(localIdx, "merge")}
                              title="Merge with existing"
                              className={cn("flex h-6 w-6 items-center justify-center rounded-md transition-colors", c.action === "merge" ? "bg-amber-500/20 text-amber-400" : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground")}
                            >
                              <GitMerge className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            onClick={() => setAction(localIdx, "skip")}
                            title="Skip this lead"
                            className={cn("flex h-6 w-6 items-center justify-center rounded-md transition-colors", c.action === "skip" ? "bg-secondary/60 text-muted-foreground" : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground")}
                          >
                            <SkipForward className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/40 px-4 py-2.5 bg-secondary/10">
            <span className="text-xs text-muted-foreground">
              {previewPage * PAGE_SIZE + 1}–{Math.min((previewPage + 1) * PAGE_SIZE, filteredCandidates.length)} of{" "}
              {filteredCandidates.length.toLocaleString()} leads
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={previewPage === 0} onClick={() => setPreviewPage(previewPage - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground px-1">{previewPage + 1} / {totalPages}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={previewPage >= totalPages - 1} onClick={() => setPreviewPage(previewPage + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Step: Configure ──────────────────────────────────────────────────────────
function ConfigureStep({ config, setConfig, readyCount }: {
  config: ImportConfig
  setConfig: (c: ImportConfig) => void
  readyCount: number
}) {
  const set = (patch: Partial<ImportConfig>) => setConfig({ ...config, ...patch })
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-semibold">Configure import settings</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          These defaults apply to all <span className="text-foreground font-medium">{readyCount}</span> leads being imported.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Pipeline */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Pipeline Stage</label>
          <div className="relative">
            <select value={config.pipeline} onChange={(e) => set({ pipeline: e.target.value as LeadStatus })} className={cn(surfaceSelectClass, "h-9 text-sm")}>
              {pipelineOrder.map((s) => <option key={s} value={s}>{statusConfig[s].label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
          <p className="text-[10px] text-muted-foreground">All imported leads start in this stage</p>
        </div>

        {/* Assigned To */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Assign to Agent <span className="normal-case font-normal">(optional)</span></label>
          <div className="relative">
            <select value={config.assignedTo} onChange={(e) => set({ assignedTo: e.target.value })} className={cn(surfaceSelectClass, "h-9 text-sm")}>
              <option value="">— Not Assigned —</option>
              {agents.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
          <p className="text-[10px] text-muted-foreground">Applies only if no agent is in the file</p>
        </div>

        {/* Priority */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Default Priority</label>
          <div className="relative">
            <select value={config.priority} onChange={(e) => set({ priority: e.target.value as LeadPriority })} className={cn(surfaceSelectClass, "h-9 text-sm")}>
              {(Object.keys(priorityConfig) as LeadPriority[]).map((p) => (
                <option key={p} value={p}>{priorityConfig[p].label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        {/* Source */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Lead Source</label>
          <div className="relative">
            <select value={config.defaultSource} onChange={(e) => set({ defaultSource: e.target.value })} className={cn(surfaceSelectClass, "h-9 text-sm")}>
              {allSources.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
          <p className="text-[10px] text-muted-foreground">Applies only if no source is in the file</p>
        </div>
      </div>

      {/* Extra tags */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Additional Tags</label>
        <input
          type="text"
          placeholder="e.g. Q1 Campaign, Newsletter, Trade Show"
          value={config.extraTags}
          onChange={(e) => set({ extraTags: e.target.value })}
          className={cn(
            "h-9 w-full rounded-md border px-3 text-sm placeholder:text-muted-foreground/50",
            surfaceInputClass
          )}
        />
        <p className="text-[10px] text-muted-foreground">Comma-separated. Added on top of "Imported" tag applied automatically.</p>
      </div>

      {/* Skip missing name */}
      <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border/40 bg-secondary/10 p-3.5">
        <div>
          <p className="text-sm font-medium">Skip rows missing a name</p>
          <p className="text-xs text-muted-foreground mt-0.5">Rows without a name field will be skipped instead of imported unnamed</p>
        </div>
        <div
          onClick={() => set({ skipMissingName: !config.skipMissingName })}
          className={cn(
            "relative flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer",
            config.skipMissingName ? "bg-primary" : "bg-secondary/60"
          )}
        >
          <span className={cn("absolute h-3.5 w-3.5 rounded-full bg-white shadow transition-all", config.skipMissingName ? "left-[18px]" : "left-[3px]")} />
        </div>
      </label>
    </div>
  )
}

// ── Step: Importing ──────────────────────────────────────────────────────────
function ImportingStep({ progress, total }: { progress: number; total: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" fill="none" strokeWidth="4" stroke="currentColor" className="text-border/30" />
          <circle
            cx="40" cy="40" r="34"
            fill="none" strokeWidth="4"
            stroke="hsl(var(--primary))"
            strokeDasharray={`${2 * Math.PI * 34}`}
            strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>
        <span className="text-lg font-bold tabular-nums">{progress}%</span>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold">Importing leads…</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {progress < 100 ? `Processing ${total.toLocaleString()} leads in batches` : "Finalising…"}
        </p>
      </div>
    </div>
  )
}

// ── Step: Done ───────────────────────────────────────────────────────────────
function DoneStep({ result, onClose, onImportMore }: {
  result: ImportResult
  onClose: () => void
  onImportMore: () => void
}) {
  const stats = [
    { label: "Imported", value: result.imported, color: "text-emerald-400" },
    { label: "Skipped",  value: result.skipped,  color: "text-muted-foreground" },
    { label: "Duplicates", value: result.duplicates, color: "text-amber-400" },
    { label: "Errors",   value: result.errors,   color: result.errors > 0 ? "text-destructive" : "text-muted-foreground" },
  ]

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-10">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 ring-4 ring-primary/10">
        <CheckCircle2 className="h-8 w-8 text-primary" />
      </div>
      <div className="text-center">
        <h3 className="text-base font-semibold">Import complete</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Successfully imported <span className="text-foreground font-medium">{result.imported.toLocaleString()}</span> leads
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 w-full max-w-sm">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1 rounded-lg border border-border/30 bg-secondary/20 p-3">
            <span className={cn("text-xl font-bold tabular-nums", s.color)}>{s.value}</span>
            <span className="text-[10px] text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      {result.errors > 0 && (
        <div className="flex w-full max-w-sm items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {result.errors} row{result.errors !== 1 ? "s" : ""} had validation errors and were skipped.
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" className="gap-1.5 border-border/50" onClick={onImportMore}>
          <RefreshCw className="h-3.5 w-3.5" />
          Import More
        </Button>
        <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25" onClick={onClose}>
          View Leads
        </Button>
      </div>
    </div>
  )
}
