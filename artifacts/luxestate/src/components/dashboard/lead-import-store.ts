export type ImportFileType = "csv" | "xlsx" | "xls" | "other"

export type ImportRecord = {
  id: string
  filename: string
  fileType: ImportFileType
  importedAt: string
  totalRows: number
  imported: number
  skipped: number
  duplicates: number
  errors: number
  pipeline: string
  assignedTo: string
  tags: string[]
}

const STORAGE_KEY = "luxestate_import_history_v1"
const MAX_RECORDS = 50

function read(): ImportRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ImportRecord[]) : []
  } catch {
    return []
  }
}

function write(records: ImportRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)))
  } catch {
    // storage full — silently ignore
  }
}

export function getImportHistory(): ImportRecord[] {
  return read()
}

export function addImportRecord(record: Omit<ImportRecord, "id">): ImportRecord {
  const full: ImportRecord = {
    ...record,
    id: `imp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  }
  const history = read()
  history.unshift(full)
  write(history)
  return full
}

export function deleteImportRecord(id: string): void {
  write(read().filter((r) => r.id !== id))
}

export function clearImportHistory(): void {
  localStorage.removeItem(STORAGE_KEY)
}
