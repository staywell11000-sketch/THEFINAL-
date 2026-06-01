import { Router, type IRouter } from "express";
import { db, activities, leadsTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/activities", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  try {
    const leadId = req.query.leadId ? parseInt(req.query.leadId as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    if (leadId && !isNaN(leadId)) {
      const rows = await db
        .select()
        .from(activities)
        .where(and(eq(activities.leadId, leadId), eq(activities.userId, userId)))
        .orderBy(desc(activities.createdAt))
        .limit(limit);
      return void res.json(rows);
    }

    const rows = await db
      .select()
      .from(activities)
      .where(eq(activities.userId, userId))
      .orderBy(desc(activities.createdAt))
      .limit(limit);
    res.json(rows);
  } catch (err) {
    console.error("Fetch activities error:", err);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

router.get("/activities/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  const userId: string = req.userId;
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });
  try {
    const [row] = await db
      .select()
      .from(activities)
      .where(and(eq(activities.id, id), eq(activities.userId, userId)));
    if (!row) return void res.status(404).json({ error: "Activity not found" });
    res.json(row);
  } catch {
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

router.post("/activities", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  try {
    const { leadId, dealId, propertyId, type, title, description, outcome, duration, metadata, scheduledAt, completedAt } = req.body;
    if (!type || !title) {
      return void res.status(400).json({ error: "type and title are required" });
    }
    const [row] = await db
      .insert(activities)
      .values({
        userId,
        leadId: leadId ?? null,
        dealId: dealId ?? null,
        propertyId: propertyId ?? null,
        type,
        title,
        description: description ?? null,
        outcome: outcome ?? null,
        duration: duration ?? null,
        metadata: metadata ?? null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        completedAt: completedAt ? new Date(completedAt) : null,
      })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    console.error("Create activity error:", err);
    res.status(500).json({ error: "Failed to create activity" });
  }
});

router.put("/activities/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  const userId: string = req.userId;
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });
  try {
    const { id: _id, userId: _uid, createdAt: _c, ...body } = req.body;
    const [row] = await db
      .update(activities)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(activities.id, id), eq(activities.userId, userId)))
      .returning();
    if (!row) return void res.status(404).json({ error: "Activity not found" });
    res.json(row);
  } catch {
    res.status(500).json({ error: "Failed to update activity" });
  }
});

router.delete("/activities/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  const userId: string = req.userId;
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });
  try {
    const deleted = await db
      .delete(activities)
      .where(and(eq(activities.id, id), eq(activities.userId, userId)))
      .returning();
    if (!deleted.length) return void res.status(404).json({ error: "Activity not found" });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to delete activity" });
  }
});

export default router;
