import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth-context";
import { useCallback } from "react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

export type AnalyticsKPIs = {
  totalLeads: number;
  wonLeads: number;
  conversionRate: number;
  totalDeals: number;
  activeDeals: number;
  closedDeals: number;
  totalPipeline: number;
  wonRevenue: number;
  totalProperties: number;
  activeProperties: number;
  teamMembers: number;
  upcomingAppointments: number;
  totalActivities: number;
  activitiesThisWeek: number;
  totalMessages: number;
};

export type SourceBreakdown = { source: string; count: number };
export type AgentPerformance = {
  agent: string; leads: number; won: number;
  winRate: number; avgScore: number; rank: number;
};
export type DealsByStage = { stage: string; count: number; value: number };
export type MessageActivity = { day: string; count: number };
export type ConversionTrend = { month: string; total: number; won: number; rate: number };
export type StatusBreakdown = { status: string; count: number };
export type PriorityBreakdown = { priority: string; count: number };
export type WeeklyActivity = { day: string; leads: number; deals: number };
export type RecentLead = { id: number; name: string; source: string; status: string; createdAt: string; score: number };
export type RecentDeal = { id: number; title: string; stage: string; value: number; updatedAt: string; leadName: string };
export type UpcomingAppointment = { id: number; title: string; dateTime: string; location: string; leadName: string };

export type AnalyticsData = {
  kpis: AnalyticsKPIs;
  sourceBreakdown: SourceBreakdown[];
  agentPerformance: AgentPerformance[];
  dealsByStage: DealsByStage[];
  messageActivity: MessageActivity[];
  conversionTrend: ConversionTrend[];
  statusBreakdown: StatusBreakdown[];
  priorityBreakdown: PriorityBreakdown[];
  weeklyActivity: WeeklyActivity[];
  recentLeads: RecentLead[];
  recentDeals: RecentDeal[];
  upcomingAppointmentsList: UpcomingAppointment[];
};

export function useAnalytics() {
  const { session } = useAuth();
  const headers = {
    "Content-Type": "application/json",
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };

  return useQuery<AnalyticsData>({
    queryKey: ["analytics"],
    queryFn: async () => {
      const res = await fetch(`${API}/analytics/overview`, { headers });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    staleTime: 1000 * 60 * 2,
    enabled: !!session,
  });
}

export function useRefreshAnalytics() {
  const qc = useQueryClient();
  return useCallback(() => {
    qc.invalidateQueries({ queryKey: ["analytics"] });
  }, [qc]);
}
