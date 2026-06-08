import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireSuperAdmin } from "../middlewares/requireSuperAdmin";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// ── helper: write audit log ────────────────────────────────────────────────
async function writeAudit(actorId: string, actorEmail: string, action: string, orgId: number | null, meta?: object) {
  try {
    await db.execute(sql`
      INSERT INTO audit_logs (actor_id, actor_email, action, entity_type, organization_id, meta, created_at)
      VALUES (${actorId}, ${actorEmail}, ${action}, 'support', ${orgId}, ${JSON.stringify(meta ?? {})}, NOW())
    `);
  } catch {}
}

// ────────────────────────────────────────────────────────────────────────────
// USER-FACING TICKET ROUTES
// ────────────────────────────────────────────────────────────────────────────

// GET /support/tickets — list user's tickets
router.get("/support/tickets", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  try {
    const rows = await db.execute(sql`
      SELECT t.*,
             o.name AS org_name,
             (SELECT COUNT(*) FROM support_messages sm WHERE sm.ticket_id = t.id)::int AS message_count,
             (SELECT sm.created_at FROM support_messages sm WHERE sm.ticket_id = t.id ORDER BY sm.created_at DESC LIMIT 1) AS last_message_at
      FROM support_tickets t
      LEFT JOIN organizations o ON o.id = t.organization_id
      WHERE t.user_id = ${userId}
      ORDER BY t.updated_at DESC
      LIMIT 50
    `);
    return res.json({ data: rows.rows });
  } catch (err) {
    logger.error({ err }, "GET /support/tickets error");
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /support/tickets — create ticket
router.post("/support/tickets", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  const userEmail: string = req.userEmail;
  const { subject, message, priority = "normal" } = req.body;
  if (!subject?.trim() || !message?.trim()) {
    return res.status(400).json({ error: "Subject and message are required" });
  }
  try {
    const orgRow = await db.execute(sql`
      SELECT id FROM organizations WHERE owner_id = ${userId}
      UNION
      SELECT organization_id FROM users WHERE id = ${userId} AND organization_id IS NOT NULL
      LIMIT 1
    `);
    const orgId = (orgRow.rows[0] as any)?.id ?? null;

    const ticket = await db.execute(sql`
      INSERT INTO support_tickets (organization_id, user_id, subject, message, status, priority, created_at, updated_at)
      VALUES (${orgId}, ${userId}, ${subject.trim()}, ${message.trim()}, 'open', ${priority}, NOW(), NOW())
      RETURNING *
    `);
    const t = ticket.rows[0] as any;

    // First message = the original message body
    await db.execute(sql`
      INSERT INTO support_messages (ticket_id, sender_id, sender_type, message, created_at)
      VALUES (${t.id}, ${userId}, 'user', ${message.trim()}, NOW())
    `);

    await writeAudit(userId, userEmail, "support_ticket_created", orgId, { ticket_id: t.id, subject: subject.trim() });
    return res.status(201).json({ data: t });
  } catch (err) {
    logger.error({ err }, "POST /support/tickets error");
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /support/tickets/:id — get ticket + messages
router.get("/support/tickets/:id", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  const ticketId = parseInt(req.params.id);
  try {
    const ticket = await db.execute(sql`
      SELECT t.*, o.name AS org_name
      FROM support_tickets t
      LEFT JOIN organizations o ON o.id = t.organization_id
      WHERE t.id = ${ticketId} AND t.user_id = ${userId}
      LIMIT 1
    `);
    if (!ticket.rows.length) return res.status(404).json({ error: "Not found" });

    const messages = await db.execute(sql`
      SELECT sm.*,
             u.first_name, u.last_name, u.email, u.avatar_url
      FROM support_messages sm
      LEFT JOIN users u ON u.id = sm.sender_id
      WHERE sm.ticket_id = ${ticketId}
      ORDER BY sm.created_at ASC
    `);
    return res.json({ ticket: ticket.rows[0], messages: messages.rows });
  } catch (err) {
    logger.error({ err }, "GET /support/tickets/:id error");
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /support/tickets/:id/messages — add message to ticket
router.post("/support/tickets/:id/messages", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  const ticketId = parseInt(req.params.id);
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: "Message required" });
  try {
    // Verify ownership
    const ticket = await db.execute(sql`SELECT id, status FROM support_tickets WHERE id = ${ticketId} AND user_id = ${userId} LIMIT 1`);
    if (!ticket.rows.length) return res.status(404).json({ error: "Not found" });

    const msg = await db.execute(sql`
      INSERT INTO support_messages (ticket_id, sender_id, sender_type, message, created_at)
      VALUES (${ticketId}, ${userId}, 'user', ${message.trim()}, NOW())
      RETURNING *
    `);
    await db.execute(sql`UPDATE support_tickets SET updated_at = NOW(), status = CASE WHEN status = 'waiting_customer' THEN 'in_progress' ELSE status END WHERE id = ${ticketId}`);

    return res.status(201).json({ data: msg.rows[0] });
  } catch (err) {
    logger.error({ err }, "POST /support/tickets/:id/messages error");
    return res.status(500).json({ error: "Server error" });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// SUPER ADMIN SUPPORT PANEL ROUTES
// ────────────────────────────────────────────────────────────────────────────

// GET /admin/support/tickets
router.get("/admin/support/tickets", requireAuth, requireSuperAdmin, async (req: any, res) => {
  const { status = "all", page = "1" } = req.query as Record<string, string>;
  const limit = 30;
  const offset = (Math.max(1, parseInt(page)) - 1) * limit;
  try {
    const rows = await db.execute(sql`
      SELECT t.*,
             o.name AS org_name,
             u.first_name, u.last_name, u.email AS user_email,
             (SELECT COUNT(*) FROM support_messages sm WHERE sm.ticket_id = t.id)::int AS message_count,
             (SELECT sm.created_at FROM support_messages sm WHERE sm.ticket_id = t.id ORDER BY sm.created_at DESC LIMIT 1) AS last_message_at
      FROM support_tickets t
      LEFT JOIN organizations o ON o.id = t.organization_id
      LEFT JOIN users u ON u.id = t.user_id
      WHERE (${status} = 'all' OR t.status = ${status})
      ORDER BY
        CASE t.status WHEN 'open' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'waiting_customer' THEN 3 ELSE 4 END,
        t.updated_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    const total = await db.execute(sql`
      SELECT COUNT(*) FROM support_tickets WHERE (${status} = 'all' OR status = ${status})
    `);
    return res.json({ data: rows.rows, total: Number((total.rows[0] as any).count) });
  } catch (err) {
    logger.error({ err }, "GET /admin/support/tickets error");
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /admin/support/tickets/:id
router.get("/admin/support/tickets/:id", requireAuth, requireSuperAdmin, async (req: any, res) => {
  const ticketId = parseInt(req.params.id);
  try {
    const ticket = await db.execute(sql`
      SELECT t.*, o.name AS org_name, u.first_name, u.last_name, u.email AS user_email
      FROM support_tickets t
      LEFT JOIN organizations o ON o.id = t.organization_id
      LEFT JOIN users u ON u.id = t.user_id
      WHERE t.id = ${ticketId} LIMIT 1
    `);
    if (!ticket.rows.length) return res.status(404).json({ error: "Not found" });

    const messages = await db.execute(sql`
      SELECT sm.*, u.first_name, u.last_name, u.email, u.avatar_url, u.role
      FROM support_messages sm
      LEFT JOIN users u ON u.id = sm.sender_id
      WHERE sm.ticket_id = ${ticketId}
      ORDER BY sm.created_at ASC
    `);
    return res.json({ ticket: ticket.rows[0], messages: messages.rows });
  } catch (err) {
    logger.error({ err }, "GET /admin/support/tickets/:id error");
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /admin/support/tickets/:id/reply
router.post("/admin/support/tickets/:id/reply", requireAuth, requireSuperAdmin, async (req: any, res) => {
  const adminId: string = req.userId;
  const adminEmail: string = req.userEmail;
  const ticketId = parseInt(req.params.id);
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: "Message required" });
  try {
    const ticket = await db.execute(sql`SELECT id, organization_id FROM support_tickets WHERE id = ${ticketId} LIMIT 1`);
    if (!ticket.rows.length) return res.status(404).json({ error: "Not found" });

    const msg = await db.execute(sql`
      INSERT INTO support_messages (ticket_id, sender_id, sender_type, message, created_at)
      VALUES (${ticketId}, ${adminId}, 'support', ${message.trim()}, NOW())
      RETURNING *
    `);
    await db.execute(sql`UPDATE support_tickets SET updated_at = NOW(), status = 'waiting_customer' WHERE id = ${ticketId} AND status = 'open'`);

    const orgId = (ticket.rows[0] as any).organization_id;
    await writeAudit(adminId, adminEmail, "support_reply_sent", orgId, { ticket_id: ticketId });
    return res.status(201).json({ data: msg.rows[0] });
  } catch (err) {
    logger.error({ err }, "POST /admin/support/tickets/:id/reply error");
    return res.status(500).json({ error: "Server error" });
  }
});

// PATCH /admin/support/tickets/:id/status
router.patch("/admin/support/tickets/:id/status", requireAuth, requireSuperAdmin, async (req: any, res) => {
  const adminId: string = req.userId;
  const adminEmail: string = req.userEmail;
  const ticketId = parseInt(req.params.id);
  const { status } = req.body;
  const VALID = ["open", "in_progress", "waiting_customer", "resolved", "closed"];
  if (!VALID.includes(status)) return res.status(400).json({ error: "Invalid status" });
  try {
    const resolvedAt = ["resolved", "closed"].includes(status) ? sql`NOW()` : sql`NULL`;
    await db.execute(sql`
      UPDATE support_tickets SET status = ${status}, updated_at = NOW(),
      resolved_at = CASE WHEN ${status} IN ('resolved','closed') THEN NOW() ELSE resolved_at END
      WHERE id = ${ticketId}
    `);
    const ticket = await db.execute(sql`SELECT organization_id FROM support_tickets WHERE id = ${ticketId} LIMIT 1`);
    await writeAudit(adminId, adminEmail, "support_ticket_status_changed", (ticket.rows[0] as any)?.organization_id ?? null, { ticket_id: ticketId, status });
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "PATCH /admin/support/tickets/:id/status error");
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
