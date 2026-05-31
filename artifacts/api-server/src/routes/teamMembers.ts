import { Router, type IRouter } from "express";
import { db, teamMembers, leadsTable } from "@workspace/db";
import { eq, sql, ilike, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// Fetch all team members with live assigned-lead count
router.get("/team-members", requireAuth, async (_req, res) => {
  try {
    const members = await db
      .select()
      .from(teamMembers)
      .orderBy(sql`${teamMembers.createdAt} DESC`);

    // Count leads assigned to each member by name (assignedTo is a text field)
    const leadCounts = await db
      .select({
        assignedTo: leadsTable.assignedTo,
        count: sql<number>`count(*)::int`,
      })
      .from(leadsTable)
      .groupBy(leadsTable.assignedTo);

    const countMap = Object.fromEntries(
      leadCounts.map((r) => [r.assignedTo?.toLowerCase() ?? "", r.count])
    );

    const result = members.map((m) => ({
      ...m,
      assignedLeadsCount: countMap[m.name.toLowerCase()] ?? 0,
    }));

    res.json(result);
  } catch (err) {
    console.error("Team members fetch error:", err);
    res.status(500).json({ error: "Failed to fetch team members" });
  }
});

// Get single member with their assigned leads
router.get("/team-members/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });

  try {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, id));

    if (!member) return void res.status(404).json({ error: "Team member not found" });

    // Fetch leads assigned to this member
    const assignedLeads = await db
      .select({
        id: leadsTable.id,
        name: leadsTable.name,
        email: leadsTable.email,
        status: leadsTable.status,
        priority: leadsTable.priority,
        source: leadsTable.source,
        budget: leadsTable.budget,
        createdAt: leadsTable.createdAt,
      })
      .from(leadsTable)
      .where(ilike(leadsTable.assignedTo, member.name))
      .orderBy(sql`${leadsTable.createdAt} DESC`);

    res.json({ ...member, assignedLeadsCount: assignedLeads.length, assignedLeads });
  } catch (err) {
    console.error("Team member fetch error:", err);
    res.status(500).json({ error: "Failed to fetch team member" });
  }
});

// Create team member
router.post("/team-members", requireAuth, async (req, res) => {
  try {
    const { id: _id, createdAt: _c, updatedAt: _u, assignedLeadsCount: _alc, assignedLeads: _al, ...body } = req.body;
    const userId = (req as any).userId;

    if (!body.name?.trim()) return void res.status(400).json({ error: "Name is required" });
    if (!body.email?.trim()) return void res.status(400).json({ error: "Email is required" });

    const [row] = await db
      .insert(teamMembers)
      .values({
        ...body,
        userId,
        role: body.role ?? "agent",
      })
      .returning();

    res.status(201).json({ ...row, assignedLeadsCount: 0 });
  } catch (err) {
    console.error("Team member create error:", err);
    res.status(500).json({ error: "Failed to create team member" });
  }
});

// Update team member
router.patch("/team-members/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });

  try {
    const { id: _id, createdAt: _c, updatedAt: _u, assignedLeadsCount: _alc, assignedLeads: _al, ...body } = req.body;

    const [row] = await db
      .update(teamMembers)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(teamMembers.id, id))
      .returning();

    if (!row) return void res.status(404).json({ error: "Team member not found" });
    res.json({ ...row, assignedLeadsCount: 0 });
  } catch (err) {
    console.error("Team member update error:", err);
    res.status(500).json({ error: "Failed to update team member" });
  }
});

// Delete team member
router.delete("/team-members/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });

  try {
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
    res.status(204).send();
  } catch (err) {
    console.error("Team member delete error:", err);
    res.status(500).json({ error: "Failed to delete team member" });
  }
});

// Assign a lead to a team member (updates lead's assignedTo field)
router.post("/team-members/:id/assign-lead", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });

  const { leadId } = req.body as { leadId: number };
  if (!leadId) return void res.status(400).json({ error: "leadId is required" });

  try {
    const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    if (!member) return void res.status(404).json({ error: "Team member not found" });

    const [lead] = await db
      .update(leadsTable)
      .set({ assignedTo: member.name, updatedAt: new Date() })
      .where(eq(leadsTable.id, leadId))
      .returning();

    if (!lead) return void res.status(404).json({ error: "Lead not found" });
    res.json({ ok: true, lead });
  } catch (err) {
    console.error("Assign lead error:", err);
    res.status(500).json({ error: "Failed to assign lead" });
  }
});

export default router;
