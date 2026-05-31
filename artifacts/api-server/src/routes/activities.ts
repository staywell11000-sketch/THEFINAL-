import { Router, type IRouter } from "express";
import { db, activities, leadsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/activities", requireAuth, async (req, res) => {
  try {
    const leadId = req.query.leadId ? parseInt(req.query.leadId as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    let query = db.select().from(activities).orderBy(desc(activities.createdAt)).limit(limit);
    if (leadId && !isNaN(leadId)) {
      const rows = await db
        .select()
        .from(activities)
        .where(eq(activities.leadId, leadId))
        .orderBy(desc(activities.createdAt))
        .limit(limit);
      return void res.json(rows);
    }
    const rows = await query;
    res.json(rows);
  } catch (err) {
    console.error("Fetch activities error:", err);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

router.get("/activities/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });
  try {
    const [row] = await db.select().from(activities).where(eq(activities.id, id));
    if (!row) return void res.status(404).json({ error: "Activity not found" });
    res.json(row);
  } catch {
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

router.post("/activities", requireAuth, async (req, res) => {
  try {
    const { userId, leadId, dealId, propertyId, type, title, description, outcome, duration, metadata, scheduledAt, completedAt } = req.body;
    if (!userId || !type || !title) {
      return void res.status(400).json({ error: "userId, type, and title are required" });
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

router.patch("/activities/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });
  try {
    const { id: _id, createdAt: _c, ...body } = req.body;
    const [row] = await db
      .update(activities)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(activities.id, id))
      .returning();
    if (!row) return void res.status(404).json({ error: "Activity not found" });
    res.json(row);
  } catch {
    res.status(500).json({ error: "Failed to update activity" });
  }
});

router.delete("/activities/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });
  try {
    await db.delete(activities).where(eq(activities.id, id));
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to delete activity" });
  }
});

export default router;
