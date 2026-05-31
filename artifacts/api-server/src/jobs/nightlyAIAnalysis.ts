import { schedule } from "node-cron";
import { db, leadsTable, activities, deals } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { logger } from "../lib/logger";
import { openai } from "../lib/openai";

async function analyzeLeadNightly(lead: typeof leadsTable.$inferSelect): Promise<void> {
  const leadActivities = await db
    .select()
    .from(activities)
    .where(eq(activities.leadId, lead.id))
    .orderBy(desc(activities.createdAt))
    .limit(5);

  const leadDeals = await db
    .select()
    .from(deals)
    .where(eq(deals.leadId, lead.id))
    .limit(1);

  const recentActivities = leadActivities.map(
    (a) => `${a.type}: ${a.title}${a.outcome ? ` → ${a.outcome}` : ""}`
  );
  const dealInfo = leadDeals[0]
    ? `Stage: ${leadDeals[0].stage}, Value: $${leadDeals[0].value ?? "TBD"}`
    : null;

  const prompt = `You are an AI assistant for a luxury real estate CRM. Analyze this lead and return JSON.
Lead: ${lead.name} | Status: ${lead.status} | Budget: ${lead.budget || "N/A"} | Priority: ${lead.priority}
Last Contact: ${lead.lastContact || "Unknown"}
Activities: ${recentActivities.length > 0 ? recentActivities.join("; ") : "None"}
Deal: ${dealInfo || "None"}
Return ONLY JSON: {"score":<0-100>,"urgencyScore":<0-100>,"aiSummary":"<2-3 sentences>","suggestedActions":["<action1>","<action2>","<action3>"]}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  const analysis = JSON.parse(content) as {
    score: number;
    urgencyScore: number;
    aiSummary: string;
    suggestedActions: string[];
  };

  await db
    .update(leadsTable)
    .set({
      score: analysis.score,
      urgencyScore: analysis.urgencyScore,
      aiSummary: analysis.aiSummary,
      suggestedActions: analysis.suggestedActions,
      updatedAt: new Date(),
    })
    .where(eq(leadsTable.id, lead.id));
}

export function startNightlyAIAnalysisJob(): void {
  // Runs every day at 2:00 AM
  schedule("0 2 * * *", async () => {
    logger.info("Nightly AI analysis job started");
    try {
      const allLeads = await db
        .select()
        .from(leadsTable)
        .orderBy(desc(leadsTable.updatedAt))
        .limit(50);

      let success = 0;
      let failed = 0;

      for (const lead of allLeads) {
        try {
          await analyzeLeadNightly(lead);
          success++;
          // Pace requests to avoid rate limits
          await new Promise((r) => setTimeout(r, 300));
        } catch (err) {
          failed++;
          logger.error({ leadId: lead.id, err }, "Nightly analysis failed for lead");
        }
      }

      logger.info({ success, failed, total: allLeads.length }, "Nightly AI analysis job completed");
    } catch (err) {
      logger.error({ err }, "Nightly AI analysis job failed");
    }
  });

  logger.info("Nightly AI analysis job scheduled (every day at 2:00 AM)");
}
