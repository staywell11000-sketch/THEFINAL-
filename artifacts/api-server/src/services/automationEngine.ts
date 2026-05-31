import { db, automations, automationLogs, leadsTable, activities, notifications } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";

export type TriggerType =
  | "lead_created"
  | "lead_status_changed"
  | "message_received"
  | "lead_score_updated";

export type TriggerContext = {
  triggerType: TriggerType;
  leadId?: number;
  lead?: typeof leadsTable.$inferSelect;
  previousStatus?: string;
  newStatus?: string;
  messageContent?: string;
  previousScore?: number;
  newScore?: number;
  userId?: string;
  [key: string]: unknown;
};

type Condition = {
  field: string;
  operator: string;
  value: unknown;
};

type Action = {
  type: string;
  config: Record<string, unknown>;
};

function evaluateCondition(condition: Condition, ctx: TriggerContext): boolean {
  const val = ctx[condition.field] ?? (ctx.lead as Record<string, unknown>)?.[condition.field];
  if (val === undefined) return false;

  switch (condition.operator) {
    case "equals":
      return String(val) === String(condition.value);
    case "not_equals":
      return String(val) !== String(condition.value);
    case "contains":
      return String(val).toLowerCase().includes(String(condition.value).toLowerCase());
    case "greater_than":
      return Number(val) > Number(condition.value);
    case "less_than":
      return Number(val) < Number(condition.value);
    case "greater_than_or_equal":
      return Number(val) >= Number(condition.value);
    case "less_than_or_equal":
      return Number(val) <= Number(condition.value);
    case "is_empty":
      return !val || String(val).trim() === "";
    case "is_not_empty":
      return !!val && String(val).trim() !== "";
    default:
      return false;
  }
}

async function executeAction(
  action: Action,
  ctx: TriggerContext
): Promise<{ type: string; result: string; error?: string }> {
  const { type, config } = action;
  const lead = ctx.lead;

  try {
    switch (type) {
      case "notify": {
        if (!ctx.userId && !lead) return { type, result: "skipped: no user or lead" };
        const userId = (config.userId as string) || ctx.userId || "";
        if (!userId) return { type, result: "skipped: no userId for notification" };
        const message =
          (config.message as string)
            ?.replace("{{lead_name}}", lead?.name ?? "")
            ?.replace("{{lead_status}}", lead?.status ?? "")
            ?.replace("{{lead_score}}", String(lead?.score ?? "")) ??
          "Automation triggered";
        await db.insert(notifications).values({
          userId,
          type: (config.notificationType as string) || "automation",
          title: (config.title as string) || "Automation Alert",
          message,
          isRead: false,
          metadata: { automationAction: true, leadId: ctx.leadId },
        });
        return { type, result: `Notification sent: ${message}` };
      }

      case "assign_agent": {
        if (!ctx.leadId) return { type, result: "skipped: no leadId" };
        const agentName = config.agentName as string;
        if (!agentName) return { type, result: "skipped: no agentName configured" };
        await db
          .update(leadsTable)
          .set({ assignedTo: agentName, updatedAt: new Date() })
          .where(eq(leadsTable.id, ctx.leadId));
        return { type, result: `Lead assigned to ${agentName}` };
      }

      case "update_status": {
        if (!ctx.leadId) return { type, result: "skipped: no leadId" };
        const newStatus = config.status as string;
        if (!newStatus) return { type, result: "skipped: no status configured" };
        await db
          .update(leadsTable)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(leadsTable.id, ctx.leadId));
        return { type, result: `Lead status updated to ${newStatus}` };
      }

      case "log_activity": {
        if (!ctx.leadId || !ctx.userId) return { type, result: "skipped: missing leadId or userId" };
        const title =
          (config.title as string)
            ?.replace("{{lead_name}}", lead?.name ?? "")
            ?.replace("{{trigger}}", ctx.triggerType) ?? "Automated activity";
        await db.insert(activities).values({
          userId: ctx.userId,
          leadId: ctx.leadId,
          type: (config.activityType as string) || "system",
          title,
          description: (config.description as string) || `Triggered by automation: ${ctx.triggerType}`,
          completedAt: new Date(),
        });
        return { type, result: `Activity logged: ${title}` };
      }

      case "update_priority": {
        if (!ctx.leadId) return { type, result: "skipped: no leadId" };
        const priority = config.priority as string;
        if (!priority) return { type, result: "skipped: no priority configured" };
        await db
          .update(leadsTable)
          .set({ priority, updatedAt: new Date() })
          .where(eq(leadsTable.id, ctx.leadId));
        return { type, result: `Lead priority updated to ${priority}` };
      }

      default:
        return { type, result: `Unknown action type: ${type}` };
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({ type, error: errorMsg }, "Action execution failed");
    return { type, result: "failed", error: errorMsg };
  }
}

export async function fireTrigger(ctx: TriggerContext): Promise<void> {
  try {
    const activeAutomations = await db
      .select()
      .from(automations)
      .where(and(eq(automations.isActive, true), eq(automations.triggerType, ctx.triggerType)));

    if (activeAutomations.length === 0) return;

    for (const automation of activeAutomations) {
      const start = Date.now();
      const actionsExecuted: Array<{ type: string; result: string; error?: string }> = [];
      let status = "success";
      let errorMessage: string | undefined;

      try {
        const conditions = (automation.conditions ?? []) as Condition[];
        const conditionsMet = conditions.every((c) => evaluateCondition(c, ctx));
        if (!conditionsMet) continue;

        const actions = (automation.actions ?? []) as Action[];
        for (const action of actions) {
          const result = await executeAction(action, ctx);
          actionsExecuted.push(result);
          if (result.error) status = "partial";
        }

        await db
          .update(automations)
          .set({
            lastRunAt: new Date(),
            lastRunStatus: status,
            runCount: (automation.runCount ?? 0) + 1,
            updatedAt: new Date(),
          })
          .where(eq(automations.id, automation.id));
      } catch (err) {
        status = "error";
        errorMessage = err instanceof Error ? err.message : String(err);
        await db
          .update(automations)
          .set({
            lastRunAt: new Date(),
            lastRunStatus: "error",
            errorCount: (automation.errorCount ?? 0) + 1,
            updatedAt: new Date(),
          })
          .where(eq(automations.id, automation.id));
      }

      await db.insert(automationLogs).values({
        automationId: automation.id,
        leadId: ctx.leadId ?? null,
        triggerType: ctx.triggerType,
        status,
        actionsExecuted,
        triggerData: {
          previousStatus: ctx.previousStatus,
          newStatus: ctx.newStatus,
          messageContent: ctx.messageContent,
        },
        errorMessage: errorMessage ?? null,
        durationMs: Date.now() - start,
      });

      logger.info(
        { automationId: automation.id, triggerType: ctx.triggerType, status, actionsExecuted },
        "Automation executed"
      );
    }
  } catch (err) {
    logger.error({ err, triggerType: ctx.triggerType }, "fireTrigger error");
  }
}
