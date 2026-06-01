import { Router, type IRouter } from "express";
import { db, teamMembers, leadsTable } from "@workspace/db";
import { eq, sql, ilike, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// Fetch all team members for the authenticated user
router.get("/team-members", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  try {
    const members = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId))
      .orderBy(sql`${teamMembers.createdAt} DESC`);

    // Count leads assigned to each member by name (scoped to this user's leads)
    const leadCounts = await db
      .select({
        assignedTo: leadsTable.assignedTo,
        count: sql<number>`count(*)::int`,
      })
      .from(leadsTable)
      .where(sql`(${leadsTable.createdById} = ${userId} OR ${leadsTable.createdById} IS NULL)`)
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

// Get single member (must belong to the authenticated user)
router.get("/team-members/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  const userId: string = req.userId;
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });

  try {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.id, id), eq(teamMembers.userId, userId)));

    if (!member) return void res.status(404).json({ error: "Team member not found" });

    // Fetch leads assigned to this member (scoped to this user's leads)
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
      .where(
        sql`${leadsTable.assignedTo} ILIKE ${member.name}
          AND (${leadsTable.createdById} = ${userId} OR ${leadsTable.createdById} IS NULL)`
      )
      .orderBy(sql`${leadsTable.createdAt} DESC`);

    res.json({ ...member, assignedLeadsCount: assignedLeads.length, assignedLeads });
  } catch (err) {
    console.error("Team member fetch error:", err);
    res.status(500).json({ error: "Failed to fetch team member" });
  }
});

// Create team member
router.post("/team-members", requireAuth, async (req: any, res) => {
  const userId: string = req.userId;
  try {
    const { id: _id, createdAt: _c, updatedAt: _u, assignedLeadsCount: _alc, assignedLeads: _al, ...body } = req.body;

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

// Update team member (must belong to the authenticated user)
router.patch("/team-members/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  const userId: string = req.userId;
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });

  try {
    const { id: _id, createdAt: _c, updatedAt: _u, assignedLeadsCount: _alc, assignedLeads: _al, ...body } = req.body;

    const [row] = await db
      .update(teamMembers)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(teamMembers.id, id), eq(teamMembers.userId, userId)))
      .returning();

    if (!row) return void res.status(404).json({ error: "Team member not found" });
    res.json({ ...row, assignedLeadsCount: 0 });
  } catch (err) {
    console.error("Team member update error:", err);
    res.status(500).json({ error: "Failed to update team member" });
  }
});

// Delete team member (must belong to the authenticated user)
router.delete("/team-members/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  const userId: string = req.userId;
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });

  try {
    const deleted = await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.id, id), eq(teamMembers.userId, userId)))
      .returning();
    if (!deleted.length) return void res.status(404).json({ error: "Team member not found" });
    res.status(204).send();
  } catch (err) {
    console.error("Team member delete error:", err);
    res.status(500).json({ error: "Failed to delete team member" });
  }
});

// Assign a lead to a team member
router.post("/team-members/:id/assign-lead", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  const userId: string = req.userId;
  if (isNaN(id)) return void res.status(400).json({ error: "Invalid ID" });

  const { leadId } = req.body as { leadId: number };
  if (!leadId) return void res.status(400).json({ error: "leadId is required" });

  try {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.id, id), eq(teamMembers.userId, userId)));
    if (!member) return void res.status(404).json({ error: "Team member not found" });

    const [lead] = await db
      .update(leadsTable)
      .set({ assignedTo: member.name, updatedAt: new Date() })
      .where(
        sql`${leadsTable.id} = ${leadId}
          AND (${leadsTable.createdById} = ${userId} OR ${leadsTable.createdById} IS NULL)`
      )
      .returning();

    if (!lead) return void res.status(404).json({ error: "Lead not found" });
    res.json({ ok: true, lead });
  } catch (err) {
    console.error("Assign lead error:", err);
    res.status(500).json({ error: "Failed to assign lead" });
  }
});

export default router;
