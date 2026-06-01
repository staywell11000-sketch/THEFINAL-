import { Router, type IRouter } from "express";
import { db, notifications } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  try {
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    res.json(rows);
  } catch (err) {
    console.error("GET /notifications error:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.get("/notifications/unread-count", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  try {
    const result = await db.execute<{ count: string }>(sql`
      SELECT COUNT(*)::text AS count FROM notifications
      WHERE user_id = ${userId} AND read = false
    `);
    res.json({ count: parseInt(result.rows[0]?.count ?? "0", 10) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch count" });
  }
});

router.patch("/notifications/:id/read", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });
  try {
    await db
      .update(notifications)
      .set({ read: true, readAt: new Date(), updatedAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, req.userId)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark read" });
  }
});

router.patch("/notifications/read-all", requireAuth, async (req: any, res) => {
  try {
    await db
      .update(notifications)
      .set({ read: true, readAt: new Date(), updatedAt: new Date() })
      .where(and(eq(notifications.userId, req.userId), eq(notifications.read, false)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark all read" });
  }
});

router.delete("/notifications/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });
  try {
    await db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, req.userId)));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

export default router;
