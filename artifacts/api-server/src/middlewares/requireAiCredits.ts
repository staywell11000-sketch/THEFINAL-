import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const SUPER_ADMIN_EMAIL = "murtazaarshad499@gmail.com";

const PLAN_AI_REQUESTS: Record<string, number> = {
  starter: 100,
  professional: 1000,
  agency: 5000,
  trial: 30,
};

export async function requireAiCredits(req: Request, res: Response, next: NextFunction) {
  const userEmail = (req as any).userEmail as string | undefined;
  const userId = (req as any).userId as string;

  // Super admin bypass
  if (userEmail === SUPER_ADMIN_EMAIL) return next();
  try {
    const userRow = await db.execute(sql`SELECT role FROM users WHERE id = ${userId}`);
    if ((userRow.rows[0] as any)?.role === "super_admin") return next();
  } catch {}

  try {
    // Get org info
    const orgRow = await db.execute(sql`
      SELECT o.id, o.plan, o.subscription_status, o.ai_requests_used, o.ai_requests_reset_at
      FROM organizations o
      WHERE o.owner_id = ${userId}
         OR o.id = (SELECT organization_id FROM users WHERE id = ${userId})
      LIMIT 1
    `);

    if (!orgRow.rows.length) {
      return res.status(403).json({
        error: "ai_limit_reached",
        message: "No organization found. Please set up your organization.",
      });
    }

    const org = orgRow.rows[0] as any;

    // Monthly reset check
    const now = new Date();
    const resetAt = org.ai_requests_reset_at ? new Date(org.ai_requests_reset_at) : null;
    const needsReset = !resetAt || (now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear());

    if (needsReset) {
      await db.execute(sql`
        UPDATE organizations SET ai_requests_used = 0, ai_requests_reset_at = NOW(), updated_at = NOW()
        WHERE id = ${org.id}
      `);
      org.ai_requests_used = 0;
    }

    const planIncluded = PLAN_AI_REQUESTS[org.plan] ?? PLAN_AI_REQUESTS.trial;
    const used = org.ai_requests_used ?? 0;
    const remaining_plan = Math.max(0, planIncluded - used);

    // Check addon requests
    const addonRow = await db.execute(sql`
      SELECT COALESCE(SUM(quantity_remaining), 0) as addon_remaining
      FROM organization_addons
      WHERE organization_id = ${org.id}
        AND addon_type = 'ai_requests'
        AND quantity_remaining > 0
        AND (expires_at IS NULL OR expires_at > NOW())
    `);
    const addonRemaining = Number((addonRow.rows[0] as any)?.addon_remaining ?? 0);

    const totalAvailable = remaining_plan + addonRemaining;

    if (totalAvailable <= 0) {
      return res.status(429).json({
        error: "ai_limit_reached",
        message: "You have reached your monthly AI limit.",
        planIncluded,
        used,
        addonRemaining,
        totalAvailable: 0,
      });
    }

    // Attach org info for the route to use
    (req as any).orgId = org.id;
    (req as any).orgPlan = org.plan;
    (req as any).aiRemaining = totalAvailable;
    (req as any).aiRemainingPlan = remaining_plan;
    (req as any).aiRemainingAddon = addonRemaining;

    next();
  } catch (err) {
    // Don't block on middleware errors — let the request through
    next();
  }
}

export async function consumeAiCredit(orgId: number, userId: string, feature: string, usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number; estimated_cost: number; model: string }) {
  try {
    // Deduct from plan allowance first (increment used counter)
    await db.execute(sql`
      UPDATE organizations SET ai_requests_used = ai_requests_used + 1, updated_at = NOW()
      WHERE id = ${orgId}
    `);

    // Check if plan allowance covers it; if plan is exhausted, deduct addon
    const orgRow = await db.execute(sql`
      SELECT o.plan, o.ai_requests_used,
             (SELECT COALESCE(SUM(quantity_remaining), 0) FROM organization_addons
              WHERE organization_id = o.id AND addon_type = 'ai_requests' AND quantity_remaining > 0
                AND (expires_at IS NULL OR expires_at > NOW())) as addon_remaining
      FROM organizations o WHERE id = ${orgId}
    `);
    const org = orgRow.rows[0] as any;
    const planLimit = PLAN_AI_REQUESTS[org.plan] ?? 30;

    if (org.ai_requests_used > planLimit && org.addon_remaining > 0) {
      // Deduct from oldest non-expired addon
      await db.execute(sql`
        UPDATE organization_addons
        SET quantity_remaining = quantity_remaining - 1, updated_at = NOW()
        WHERE id = (
          SELECT id FROM organization_addons
          WHERE organization_id = ${orgId} AND addon_type = 'ai_requests'
            AND quantity_remaining > 0 AND (expires_at IS NULL OR expires_at > NOW())
          ORDER BY purchased_at ASC LIMIT 1
        )
      `);
    }

    // Log to ai_usage
    await db.execute(sql`
      INSERT INTO ai_usage (organization_id, user_id, feature, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost, created_at)
      VALUES (${orgId}, ${userId}, ${feature}, ${usage.model}, ${usage.prompt_tokens}, ${usage.completion_tokens}, ${usage.total_tokens}, ${usage.estimated_cost}, NOW())
    `);
  } catch {}
}
