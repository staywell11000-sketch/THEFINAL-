import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

async function writeAudit(actorId: string, actorEmail: string, action: string, orgId: number | null, meta?: object) {
  try {
    await db.execute(sql`
      INSERT INTO audit_logs (actor_id, actor_email, action, entity_type, organization_id, meta, created_at)
      VALUES (${actorId}, ${actorEmail}, ${action}, 'privacy', ${orgId}, ${JSON.stringify(meta ?? {})}, NOW())
    `);
  } catch {}
}

async function getOrgForUser(userId: string): Promise<{ id: number; owner_id: string; org_role: string } | null> {
  const row = await db.execute(sql`
    SELECT o.id, o.owner_id, u.org_role
    FROM organizations o
    JOIN users u ON (u.id = ${userId})
    WHERE o.owner_id = ${userId}
       OR (u.organization_id = o.id AND u.id = ${userId})
    LIMIT 1
  `);
  return (row.rows[0] as any) ?? null;
}

// GET /privacy/settings — get org privacy state
router.get("/privacy/settings", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  try {
    const row = await db.execute(sql`
      SELECT o.id, o.support_access_enabled, o.support_access_enabled_by, o.support_access_enabled_at
      FROM organizations o
      WHERE o.owner_id = ${userId}
         OR o.id = (SELECT organization_id FROM users WHERE id = ${userId} AND organization_id IS NOT NULL LIMIT 1)
      LIMIT 1
    `);
    return res.json({ settings: row.rows[0] ?? null });
  } catch (err) {
    logger.error({ err }, "GET /privacy/settings error");
    return res.status(500).json({ error: "Server error" });
  }
});

// PATCH /privacy/support-access — toggle support access (org admin only)
router.patch("/privacy/support-access", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  const userEmail: string = req.userEmail;
  const { enabled } = req.body;
  if (typeof enabled !== "boolean") return res.status(400).json({ error: "enabled (boolean) required" });
  try {
    // Must be org owner or admin
    const orgRow = await db.execute(sql`
      SELECT o.id, o.owner_id, u.org_role
      FROM organizations o
      JOIN users u ON u.id = ${userId}
      WHERE o.owner_id = ${userId}
         OR (u.organization_id = o.id AND u.org_role = 'admin')
      LIMIT 1
    `);
    if (!orgRow.rows.length) return res.status(403).json({ error: "Only organization admins can change this setting" });

    const org = orgRow.rows[0] as any;
    if (enabled) {
      await db.execute(sql`
        UPDATE organizations
        SET support_access_enabled = true,
            support_access_enabled_by = ${userId},
            support_access_enabled_at = NOW(),
            updated_at = NOW()
        WHERE id = ${org.id}
      `);
    } else {
      await db.execute(sql`
        UPDATE organizations
        SET support_access_enabled = false,
            support_access_enabled_by = NULL,
            support_access_enabled_at = NULL,
            updated_at = NOW()
        WHERE id = ${org.id}
      `);
    }
    await writeAudit(userId, userEmail,
      enabled ? "support_access_enabled" : "support_access_disabled",
      org.id,
      { enabled }
    );
    return res.json({ success: true, enabled });
  } catch (err) {
    logger.error({ err }, "PATCH /privacy/support-access error");
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /privacy/audit-log — org's own privacy audit log
router.get("/privacy/audit-log", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  try {
    const orgRow = await db.execute(sql`
      SELECT id FROM organizations
      WHERE owner_id = ${userId}
         OR id = (SELECT organization_id FROM users WHERE id = ${userId} AND organization_id IS NOT NULL LIMIT 1)
      LIMIT 1
    `);
    if (!orgRow.rows.length) return res.json({ data: [] });
    const orgId = (orgRow.rows[0] as any).id;

    const rows = await db.execute(sql`
      SELECT al.*, u.first_name, u.last_name
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.actor_id
      WHERE al.organization_id = ${orgId}
        AND al.entity_type IN ('privacy', 'export')
      ORDER BY al.created_at DESC
      LIMIT 50
    `);
    return res.json({ data: rows.rows });
  } catch (err) {
    logger.error({ err }, "GET /privacy/audit-log error");
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /privacy/export — export org data
router.post("/privacy/export", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  const userEmail: string = req.userEmail;
  const { types = ["leads", "deals", "properties", "contacts"] } = req.body;

  try {
    const orgRow = await db.execute(sql`
      SELECT id FROM organizations
      WHERE owner_id = ${userId}
         OR id = (SELECT organization_id FROM users WHERE id = ${userId} AND organization_id IS NOT NULL LIMIT 1)
      LIMIT 1
    `);
    if (!orgRow.rows.length) return res.status(403).json({ error: "No organization found" });
    const orgId = (orgRow.rows[0] as any).id;

    const exportData: Record<string, any[]> = {};

    if (types.includes("leads")) {
      const rows = await db.execute(sql`
        SELECT id, name, email, phone, status, source, budget, created_at
        FROM leads WHERE created_by_id = ${userId}
        ORDER BY created_at DESC LIMIT 5000
      `);
      exportData.leads = rows.rows;
    }
    if (types.includes("deals")) {
      const rows = await db.execute(sql`
        SELECT id, title, value, status, stage, created_at
        FROM deals WHERE created_by_id = ${userId}
        ORDER BY created_at DESC LIMIT 2000
      `);
      exportData.deals = rows.rows;
    }
    if (types.includes("properties")) {
      const rows = await db.execute(sql`
        SELECT id, title, type, price, status, location, created_at
        FROM properties WHERE listed_by_id = ${userId}
        ORDER BY created_at DESC LIMIT 2000
      `);
      exportData.properties = rows.rows;
    }
    if (types.includes("contacts")) {
      const rows = await db.execute(sql`
        SELECT id, first_name, last_name, email, phone, created_at
        FROM contacts WHERE user_id = ${userId}
        ORDER BY created_at DESC LIMIT 5000
      `);
      exportData.contacts = rows.rows;
    }
    if (types.includes("documents")) {
      const rows = await db.execute(sql`
        SELECT id, title, category, file_type, file_size, created_at
        FROM documents WHERE user_id = ${userId}
        ORDER BY created_at DESC LIMIT 2000
      `);
      exportData.documents = rows.rows;
    }

    await writeAudit(userId, userEmail, "data_exported", orgId, { types, record_counts: Object.fromEntries(Object.entries(exportData).map(([k, v]) => [k, v.length])) });

    return res.json({
      exported_at: new Date().toISOString(),
      organization_id: orgId,
      data: exportData,
    });
  } catch (err) {
    logger.error({ err }, "POST /privacy/export error");
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
