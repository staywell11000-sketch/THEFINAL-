import { Router, type IRouter } from "express";
import { db, automations, automationLogs } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { fireTrigger } from "../services/automationEngine";

const router: IRouter = Router();

router.get("/automations", requireAuth, async (_req, res) => {
  try {
    const rows = await db.select().from(automations).orderBy(desc(automations.createdAt));
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch automations" });
  }
});

router.get("/automations/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });
  try {
    const [row] = await db.select().from(automations).where(eq(automations.id, id));
    if (!row) return void res.status(404).json({ error: "Automation not found" });
    res.json(row);
  } catch {
    res.status(500).json({ error: "Failed to fetch automation" });
  }
});

router.post("/automations", requireAuth, async (req, res) => {
  try {
    const { name, description, triggerType, triggerConfig, conditions, actions, isActive, createdById } = req.body;
    if (!name || !triggerType) {
      return void res.status(400).json({ error: "name and triggerType are required" });
    }
    const [row] = await db
      .insert(automations)
      .values({
        name,
        description: description ?? null,
        triggerType,
        triggerConfig: triggerConfig ?? {},
        conditions: conditions ?? [],
        actions: actions ?? [],
        isActive: isActive ?? false,
        createdById: createdById ?? null,
      })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    console.error("Create automation error:", err);
    res.status(500).json({ error: "Failed to create automation" });
  }
});

router.put("/automations/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });
  try {
    const { id: _id, createdAt: _c, ...body } = req.body;
    const [row] = await db
      .update(automations)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(automations.id, id))
      .returning();
    if (!row) return void res.status(404).json({ error: "Automation not found" });
    res.json(row);
  } catch {
    res.status(500).json({ error: "Failed to update automation" });
  }
});

router.patch("/automations/:id/toggle", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });
  try {
    const [current] = await db.select().from(automations).where(eq(automations.id, id));
    if (!current) return void res.status(404).json({ error: "Not found" });
    const [row] = await db
      .update(automations)
      .set({ isActive: !current.isActive, updatedAt: new Date() })
      .where(eq(automations.id, id))
      .returning();
    res.json(row);
  } catch {
    res.status(500).json({ error: "Failed to toggle automation" });
  }
});

router.delete("/automations/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });
  try {
    await db.delete(automations).where(eq(automations.id, id));
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to delete automation" });
  }
});

router.post("/automations/:id/test", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });
  try {
    const [automation] = await db.select().from(automations).where(eq(automations.id, id));
    if (!automation) return void res.status(404).json({ error: "Not found" });
    const wasActive = automation.isActive;
    if (!wasActive) {
      await db.update(automations).set({ isActive: true }).where(eq(automations.id, id));
    }
    await fireTrigger({
      triggerType: automation.triggerType as "lead_created" | "lead_status_changed" | "message_received" | "lead_score_updated",
      leadId: req.body.leadId ?? undefined,
      userId: req.body.userId ?? undefined,
    });
    if (!wasActive) {
      await db.update(automations).set({ isActive: wasActive }).where(eq(automations.id, id));
    }
    res.json({ message: "Test trigger fired" });
  } catch (err) {
    console.error("Test trigger error:", err);
    res.status(500).json({ error: "Failed to test automation" });
  }
});

router.get("/automation-logs", requireAuth, async (req, res) => {
  try {
    const automationId = req.query.automationId ? parseInt(req.query.automationId as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    let rows;
    if (automationId && !isNaN(automationId)) {
      rows = await db
        .select()
        .from(automationLogs)
        .where(eq(automationLogs.automationId, automationId))
        .orderBy(desc(automationLogs.createdAt))
        .limit(limit);
    } else {
      rows = await db
        .select()
        .from(automationLogs)
        .orderBy(desc(automationLogs.createdAt))
        .limit(limit);
    }
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch automation logs" });
  }
});

export default router;
