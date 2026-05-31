import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/analytics/overview", requireAuth, async (_req, res) => {
  try {
    // --- Lead totals ---
    const leadResult = await db.execute<{ total: string; won: string; new_count: string }>(sql`
      SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE status = 'won')::text AS won,
        COUNT(*) FILTER (WHERE status = 'new')::text AS new_count
      FROM leads
    `);
    const leadStats = leadResult.rows[0];

    const totalLeads = parseInt(leadStats?.total ?? "0", 10);
    const wonLeads = parseInt(leadStats?.won ?? "0", 10);
    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 1000) / 10 : 0;

    // --- Source breakdown ---
    const sourceResult = await db.execute<{ source: string; count: string }>(sql`
      SELECT COALESCE(source, 'Unknown') AS source, COUNT(*)::text AS count
      FROM leads
      GROUP BY source
      ORDER BY count DESC
    `);
    const sourceRows = sourceResult.rows;

    // --- Agent performance ---
    const agentResult = await db.execute<{
      agent: string;
      leads: string;
      won: string;
      avg_score: string;
    }>(sql`
      SELECT
        COALESCE(assigned_to, 'Unassigned') AS agent,
        COUNT(*)::text AS leads,
        COUNT(*) FILTER (WHERE status = 'won')::text AS won,
        ROUND(AVG(score))::text AS avg_score
      FROM leads
      WHERE assigned_to IS NOT NULL AND assigned_to != ''
      GROUP BY assigned_to
      ORDER BY won DESC, leads DESC
      LIMIT 10
    `);
    const agentRows = agentResult.rows;

    // --- Deal performance ---
    const dealResult = await db.execute<{ stage: string; count: string; total_value: string }>(sql`
      SELECT
        stage,
        COUNT(*)::text AS count,
        COALESCE(SUM(value), 0)::text AS total_value
      FROM deals
      GROUP BY stage
      ORDER BY count DESC
    `);
    const dealRows = dealResult.rows;

    const dealTotalsResult = await db.execute<{ total_deals: string; total_pipeline: string; won_value: string }>(sql`
      SELECT
        COUNT(*)::text AS total_deals,
        COALESCE(SUM(value), 0)::text AS total_pipeline,
        COALESCE(SUM(value) FILTER (WHERE stage = 'won'), 0)::text AS won_value
      FROM deals
    `);
    const dealTotals = dealTotalsResult.rows[0];

    // --- Message activity (last 30 days by day) ---
    const msgResult = await db.execute<{ day: string; count: string }>(sql`
      SELECT
        TO_CHAR(DATE_TRUNC('day', m.created_at), 'Mon DD') AS day,
        COUNT(*)::text AS count
      FROM messages m
      WHERE m.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', m.created_at)
      ORDER BY DATE_TRUNC('day', m.created_at) ASC
    `);
    const msgRows = msgResult.rows;

    // --- Monthly conversion trend (last 6 months) ---
    const monthlyResult = await db.execute<{ month: string; total: string; won: string }>(sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YY') AS month,
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE status = 'won')::text AS won
      FROM leads
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) ASC
    `);
    const monthlyRows = monthlyResult.rows;

    // --- Status breakdown ---
    const statusResult = await db.execute<{ status: string; count: string }>(sql`
      SELECT status, COUNT(*)::text AS count
      FROM leads
      GROUP BY status
      ORDER BY count DESC
    `);
    const statusRows = statusResult.rows;

    // --- Priority breakdown ---
    const priorityResult = await db.execute<{ priority: string; count: string }>(sql`
      SELECT priority, COUNT(*)::text AS count
      FROM leads
      GROUP BY priority
      ORDER BY count DESC
    `);
    const priorityRows = priorityResult.rows;

    // --- Activity counts ---
    const activityResult = await db.execute<{ total: string; this_week: string }>(sql`
      SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::text AS this_week
      FROM activities
    `);
    const activityTotals = activityResult.rows[0];

    const msgTotalResult = await db.execute<{ total: string }>(sql`
      SELECT COUNT(*)::text AS total FROM messages
    `);
    const totalMessages = msgTotalResult.rows[0];

    res.json({
      kpis: {
        totalLeads,
        wonLeads,
        conversionRate,
        totalDeals: parseInt(dealTotals?.total_deals ?? "0", 10),
        totalPipeline: parseFloat(dealTotals?.total_pipeline ?? "0"),
        wonRevenue: parseFloat(dealTotals?.won_value ?? "0"),
        totalActivities: parseInt(activityTotals?.total ?? "0", 10),
        activitiesThisWeek: parseInt(activityTotals?.this_week ?? "0", 10),
        totalMessages: parseInt(totalMessages?.total ?? "0", 10),
      },
      sourceBreakdown: sourceRows.map((r) => ({
        source: r.source,
        count: parseInt(r.count, 10),
      })),
      agentPerformance: agentRows.map((r, i) => ({
        agent: r.agent,
        leads: parseInt(r.leads, 10),
        won: parseInt(r.won, 10),
        winRate:
          parseInt(r.leads, 10) > 0
            ? Math.round((parseInt(r.won, 10) / parseInt(r.leads, 10)) * 100)
            : 0,
        avgScore: parseInt(r.avg_score ?? "0", 10),
        rank: i + 1,
      })),
      dealsByStage: dealRows.map((r) => ({
        stage: r.stage,
        count: parseInt(r.count, 10),
        value: parseFloat(r.total_value),
      })),
      messageActivity: msgRows.map((r) => ({
        day: r.day,
        count: parseInt(r.count, 10),
      })),
      conversionTrend: monthlyRows.map((r) => ({
        month: r.month,
        total: parseInt(r.total, 10),
        won: parseInt(r.won, 10),
        rate:
          parseInt(r.total, 10) > 0
            ? Math.round((parseInt(r.won, 10) / parseInt(r.total, 10)) * 100)
            : 0,
      })),
      statusBreakdown: statusRows.map((r) => ({
        status: r.status,
        count: parseInt(r.count, 10),
      })),
      priorityBreakdown: priorityRows.map((r) => ({
        priority: r.priority,
        count: parseInt(r.count, 10),
      })),
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

export default router;
