import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./auth-context";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

export type AnalyticsKPIs = {
  totalLeads: number;
  wonLeads: number;
  conversionRate: number;
  totalDeals: number;
  totalPipeline: number;
  wonRevenue: number;
  totalActivities: number;
  activitiesThisWeek: number;
  totalMessages: number;
};

export type SourceBreakdown = { source: string; count: number };
export type AgentPerformance = {
  agent: string;
  leads: number;
  won: number;
  winRate: number;
  avgScore: number;
  rank: number;
};
export type DealsByStage = { stage: string; count: number; value: number };
export type MessageActivity = { day: string; count: number };
export type ConversionTrend = { month: string; total: number; won: number; rate: number };
export type StatusBreakdown = { status: string; count: number };
export type PriorityBreakdown = { priority: string; count: number };

export type AnalyticsData = {
  kpis: AnalyticsKPIs;
  sourceBreakdown: SourceBreakdown[];
  agentPerformance: AgentPerformance[];
  dealsByStage: DealsByStage[];
  messageActivity: MessageActivity[];
  conversionTrend: ConversionTrend[];
  statusBreakdown: StatusBreakdown[];
  priorityBreakdown: PriorityBreakdown[];
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
    staleTime: 1000 * 60 * 5, // 5 min cache
  });
}
