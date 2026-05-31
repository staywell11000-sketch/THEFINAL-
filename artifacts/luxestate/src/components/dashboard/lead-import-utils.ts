import Papa from "papaparse"
import * as XLSX from "xlsx"
import { Lead } from "@/components/dashboard/leads-types"

// ── Field target types ───────────────────────────────────────────────────────
export type FieldTarget =
  | "name" | "firstName" | "lastName"
  | "email" | "phone" | "whatsapp"
  | "budget" | "property" | "notes"
  | "source" | "assignedTo" | "tags"
  | "skip"

export const FIELD_LABELS: Record<FieldTarget, string> = {
  name: "Full Name",
  firstName: "First Name",
  lastName: "Last Name",
  email: "Email",
  phone: "Phone",
  whatsapp: "WhatsApp",
  budget: "Budget",
  property: "Property Interest",
  notes: "Notes",
  source: "Source",
  assignedTo: "Assigned Agent",
  tags: "Tags",
  skip: "— Skip —",
}

export type ColumnMapping = Record<number, FieldTarget>

export type ParsedFile = {
  headers: string[]
  rows: string[][]
  totalRows: number
  filename: string
  fileType: "csv" | "xlsx" | "xls" | "other"
}

export type MappedLead = {
  name: string
  email: string
  phone: string
  whatsappNumber: string
  budget: string
  property: string
  notes: string
  source: string
  assignedTo: string
  tags: string[]
  rowIndex: number
  rawRow: string[]
}

export type DuplicateMatch = {
  existingLeadId: number
  existingName: string
  existingEmail: string
  matchType: "exact_email" | "exact_phone" | "name_match"
  confidence: "high" | "medium"
}

export type ImportCandidate = MappedLead & {
  duplicates: DuplicateMatch[]
  action: "import" | "skip" | "merge"
  errors: string[]
}

// ── Detection patterns ───────────────────────────────────────────────────────
const PATTERNS: Partial<Record<FieldTarget, RegExp[]>> = {
  name:       [/^(full[\s._-]?name|name|contact|lead[\s._-]?name|person|prospect|client)$/i],
  firstName:  [/^(first[\s._-]?name|fname|given[\s._-]?name|forename)$/i],
  lastName:   [/^(last[\s._-]?name|lname|surname|family[\s._-]?name)$/i],
  email:      [/^(e[\s._-]?mail(s|[\s._-]?address)?|contact[\s._-]?email)$/i],
  phone:      [/^(phone|tel(ephone)?|mobile|cell(ular)?|contact[\s._-]?num|ph\.?|ph[\s._-]?num|mobile[\s._-]?num)$/i],
  whatsapp:   [/^(whatsapp|whats[\s._-]?app|wa|wa[\s._-]?num)$/i],
  budget:     [/^(budget|price|amount|value|asking[\s._-]?price|max[\s._-]?budget|spend|purchase[\s._-]?price)$/i],
  property:   [/^(property|unit|listing|interested[\s._-]?in|property[\s._-]?interest|address|location)$/i],
  notes:      [/^(notes?|comments?|remarks?|description|details?|info|additional)$/i],
  source:     [/^(source|lead[\s._-]?source|origin|channel|how[\s._-]?did)$/i],
  assignedTo: [/^(assigned[\s._-]?to|agent|rep(resentative)?|owner|salesperson)$/i],
  tags:       [/^(tags?|labels?|categor(y|ies)|keywords?)$/i],
}

export function detectColumnMappings(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {}
  const used = new Set<FieldTarget>()

  headers.forEach((header, idx) => {
    const h = header.trim()
    for (const [field, patterns] of Object.entries(PATTERNS) as [FieldTarget, RegExp[]][]) {
      if (used.has(field)) continue
      if (patterns.some((p) => p.test(h))) {
        mapping[idx] = field
        used.add(field)
        return
      }
    }
    // Auto-detect from content type label
    mapping[idx] = "skip"
  })

  return mapping
}

export function refineMappingFromSamples(
  mapping: ColumnMapping,
  headers: string[],
  rows: string[][]
): ColumnMapping {
  const refined = { ...mapping }
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const phoneRe = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/
  const budgetRe = /^\$?[\d,]+(\.\d{0,2})?[kKmMbB]?$/

  headers.forEach((_, idx) => {
    if (refined[idx] !== "skip") return
    const samples = rows
      .slice(0, 10)
      .map((r) => r[idx]?.trim() ?? "")
      .filter(Boolean)
    if (!samples.length) return

    const emailScore = samples.filter((s) => emailRe.test(s)).length / samples.length
    const phoneScore = samples.filter((s) => phoneRe.test(s.replace(/[\s\-().]/g, ""))).length / samples.length
    const budgetScore = samples.filter((s) => budgetRe.test(s.replace(/,/g, ""))).length / samples.length

    if (emailScore > 0.6) refined[idx] = "email"
    else if (phoneScore > 0.6) refined[idx] = "phone"
    else if (budgetScore > 0.6) refined[idx] = "budget"
  })

  return refined
}

// ── File parsers ─────────────────────────────────────────────────────────────
export async function parseCSV(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (result) => {
        const all = (result.data as string[][]).filter((r) => r.some((c) => String(c).trim()))
        if (all.length < 2) { reject(new Error("File appears to be empty or has no data rows.")); return }
        resolve({
          headers: all[0].map((h) => String(h).trim()),
          rows: all.slice(1).map((r) => r.map((c) => String(c))),
          totalRows: all.length - 1,
          filename: file.name,
          fileType: "csv",
        })
      },
      error: (err: { message: string }) => reject(new Error(`CSV parse error: ${err.message}`)),
      skipEmptyLines: true,
    })
  })
}

export async function parseXLSX(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })
        const nonEmpty = json.filter((r) => r.some((c) => String(c).trim())) as string[][]
        if (nonEmpty.length < 2) { reject(new Error("Spreadsheet appears to be empty.")); return }
        const ext = file.name.split(".").pop()?.toLowerCase()
        resolve({
          headers: nonEmpty[0].map((h) => String(h).trim()),
          rows: nonEmpty.slice(1).map((r) => r.map((c) => String(c))),
          totalRows: nonEmpty.length - 1,
          filename: file.name,
          fileType: ext === "xls" ? "xls" : "xlsx",
        })
      } catch (err) {
        reject(new Error(`Excel parse error: ${err instanceof Error ? err.message : "unknown"}`))
      }
    }
    reader.onerror = () => reject(new Error("Failed to read file."))
    reader.readAsArrayBuffer(file)
  })
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split(".").pop()?.toLowerCase()
  if (ext === "csv" || file.type === "text/csv") return parseCSV(file)
  if (ext === "xlsx" || ext === "xls") return parseXLSX(file)
  throw new Error(`Unsupported file type ".${ext}". Please upload a CSV or Excel file.`)
}

// ── Row → Lead mapping ───────────────────────────────────────────────────────
export function mapRowToLead(
  row: string[],
  mapping: ColumnMapping,
  rowIndex: number,
  defaultSource: string,
  defaultAgent: string
): MappedLead {
  let firstName = ""
  let lastName = ""
  let name = ""
  let email = ""
  let phone = ""
  let whatsappNumber = ""
  let budget = ""
  let property = ""
  let notes = ""
  let source = defaultSource
  let assignedTo = defaultAgent
  const tags: string[] = ["Imported"]

  row.forEach((val, idx) => {
    const field = mapping[idx]
    const v = val?.trim() ?? ""
    if (!v) return
    switch (field) {
      case "name":       name = v; break
      case "firstName":  firstName = v; break
      case "lastName":   lastName = v; break
      case "email":      email = v.toLowerCase(); break
      case "phone":      phone = v; break
      case "whatsapp":   whatsappNumber = v; break
      case "budget":     budget = v.startsWith("$") ? v : `$${v.replace(/^\$/, "")}`; break
      case "property":   property = v; break
      case "notes":      notes = v; break
      case "source":     source = v; break
      case "assignedTo": assignedTo = v; break
      case "tags":       tags.push(...v.split(/[,;]/).map((t) => t.trim()).filter(Boolean)); break
    }
  })

  if (!name && (firstName || lastName)) name = [firstName, lastName].filter(Boolean).join(" ")
  if (!whatsappNumber) whatsappNumber = phone

  return {
    name, email, phone, whatsappNumber, budget, property, notes,
    source, assignedTo,
    tags: [...new Set(tags)],
    rowIndex,
    rawRow: row,
  }
}

// ── Duplicate detection ──────────────────────────────────────────────────────
export function normalizePhone(p: string): string {
  return p.replace(/\D/g, "")
}

export function detectDuplicates(candidate: MappedLead, existing: Lead[]): DuplicateMatch[] {
  const dupes: DuplicateMatch[] = []
  const candEmail = candidate.email.toLowerCase().trim()
  const candPhone = normalizePhone(candidate.phone)
  const candName = candidate.name.toLowerCase().trim()

  for (const lead of existing) {
    if (candEmail && lead.email.toLowerCase() === candEmail) {
      dupes.push({ existingLeadId: lead.id, existingName: lead.name, existingEmail: lead.email, matchType: "exact_email", confidence: "high" })
      continue
    }
    if (candPhone.length >= 7 && normalizePhone(lead.phone) === candPhone) {
      dupes.push({ existingLeadId: lead.id, existingName: lead.name, existingEmail: lead.email, matchType: "exact_phone", confidence: "high" })
      continue
    }
    if (candName.length >= 3 && lead.name.toLowerCase() === candName) {
      dupes.push({ existingLeadId: lead.id, existingName: lead.name, existingEmail: lead.email, matchType: "name_match", confidence: "medium" })
    }
  }

  return dupes
}

// ── Validate a mapped lead ───────────────────────────────────────────────────
export function validateLead(lead: MappedLead): string[] {
  const errors: string[] = []
  if (!lead.name.trim()) errors.push("Missing name")
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) errors.push("Invalid email format")
  return errors
}

// ── Build candidates (with duplicate + validation) ───────────────────────────
export function buildCandidates(mapped: MappedLead[], existing: Lead[]): ImportCandidate[] {
  return mapped.map((lead) => {
    const dupes = detectDuplicates(lead, existing)
    const errors = validateLead(lead)
    return {
      ...lead,
      duplicates: dupes,
      errors,
      action: dupes.some((d) => d.confidence === "high") ? "skip" : "import",
    }
  })
}

// ── Chunked processing for large files ──────────────────────────────────────
export async function processInChunks<T, R>(
  items: T[],
  chunkSize: number,
  processor: (chunk: T[], offset: number) => R[],
  onProgress?: (done: number, total: number) => void
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)
    results.push(...processor(chunk, i))
    onProgress?.(Math.min(i + chunkSize, items.length), items.length)
    if (i + chunkSize < items.length) {
      await new Promise((r) => setTimeout(r, 0))
    }
  }
  return results
}
