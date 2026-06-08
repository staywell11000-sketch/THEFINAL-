import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "./api-fetch"

export type TicketStatus = "open" | "in_progress" | "waiting_customer" | "resolved" | "closed"
export type SenderType  = "user" | "support"

export type Ticket = {
  id: number
  organization_id: number | null
  user_id: string
  subject: string
  message: string
  status: TicketStatus
  priority: string
  created_at: string
  updated_at: string
  resolved_at: string | null
  org_name?: string
  message_count?: number
  last_message_at?: string
  first_name?: string
  last_name?: string
  user_email?: string
}

export type SupportMessage = {
  id: number
  ticket_id: number
  sender_id: string
  sender_type: SenderType
  message: string
  created_at: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  avatar_url?: string | null
  role?: string
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open:             "Open",
  in_progress:      "In Progress",
  waiting_customer: "Waiting for You",
  resolved:         "Resolved",
  closed:           "Closed",
}

export const STATUS_COLORS: Record<TicketStatus, string> = {
  open:             "bg-blue-100 text-blue-700 border-blue-200",
  in_progress:      "bg-amber-100 text-amber-700 border-amber-200",
  waiting_customer: "bg-purple-100 text-purple-700 border-purple-200",
  resolved:         "bg-green-100 text-green-700 border-green-200",
  closed:           "bg-gray-100 text-gray-600 border-gray-200",
}

// ── User hooks ────────────────────────────────────────────────────────────────
export function useTickets() {
  return useQuery({
    queryKey: ["support-tickets"],
    queryFn: () => apiFetch("/api/support/tickets").then(r => r.json()),
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}

export function useTicket(id: number | null) {
  return useQuery({
    queryKey: ["support-ticket", id],
    queryFn: () => apiFetch(`/api/support/tickets/${id}`).then(r => r.json()),
    enabled: id !== null,
    refetchInterval: 10_000,
    staleTime: 5_000,
  })
}

export function useCreateTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { subject: string; message: string; priority?: string }) =>
      apiFetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["support-tickets"] }),
  })
}

export function useSendMessage(ticketId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (message: string) =>
      apiFetch(`/api/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support-ticket", ticketId] })
      qc.invalidateQueries({ queryKey: ["support-tickets"] })
    },
  })
}

// ── Privacy hooks ─────────────────────────────────────────────────────────────
export function usePrivacySettings() {
  return useQuery({
    queryKey: ["privacy-settings"],
    queryFn: () => apiFetch("/api/privacy/settings").then(r => r.json()),
    staleTime: 60_000,
  })
}

export function useToggleSupportAccess() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (enabled: boolean) =>
      apiFetch("/api/privacy/support-access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["privacy-settings"] })
      qc.invalidateQueries({ queryKey: ["privacy-audit-log"] })
    },
  })
}

export function usePrivacyAuditLog() {
  return useQuery({
    queryKey: ["privacy-audit-log"],
    queryFn: () => apiFetch("/api/privacy/audit-log").then(r => r.json()),
    staleTime: 30_000,
  })
}

export function useDataExport() {
  return useMutation({
    mutationFn: (types: string[]) =>
      apiFetch("/api/privacy/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ types }),
      }).then(r => r.json()),
  })
}

// ── Admin hooks ───────────────────────────────────────────────────────────────
export function useAdminTickets(status: string = "all") {
  return useQuery({
    queryKey: ["admin-support-tickets", status],
    queryFn: () => apiFetch(`/api/admin/support/tickets?status=${status}`).then(r => r.json()),
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}

export function useAdminTicket(id: number | null) {
  return useQuery({
    queryKey: ["admin-support-ticket", id],
    queryFn: () => apiFetch(`/api/admin/support/tickets/${id}`).then(r => r.json()),
    enabled: id !== null,
    refetchInterval: 10_000,
    staleTime: 5_000,
  })
}

export function useAdminReply(ticketId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (message: string) =>
      apiFetch(`/api/admin/support/tickets/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-support-ticket", ticketId] })
      qc.invalidateQueries({ queryKey: ["admin-support-tickets"] })
    },
  })
}

export function useAdminUpdateStatus(ticketId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (status: TicketStatus) =>
      apiFetch(`/api/admin/support/tickets/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-support-ticket", ticketId] })
      qc.invalidateQueries({ queryKey: ["admin-support-tickets"] })
    },
  })
}
