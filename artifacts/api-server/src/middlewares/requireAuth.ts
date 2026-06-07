import { type Request, type Response, type NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.slice(7);

  // ── Step 1: Validate token with Supabase ──────────────────
  let user: { id: string; email?: string; user_metadata?: Record<string, string> };
  try {
    const { data: { user: u }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !u) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    user = u as any;
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  (req as any).userId = user.id;
  (req as any).userEmail = user.email;

  // ── Step 2: Upsert user in local DB ───────────────────────
  // Errors here are server errors, not auth failures — return 500 not 401
  try {
    const meta = (user.user_metadata ?? {}) as Record<string, string>;
    const fullName: string = meta.full_name ?? meta.name ?? "";
    const [firstName, ...rest] = fullName.split(" ");
    const lastName = rest.join(" ") || null;
    const email = user.email ?? "";
    const isSuperAdmin = email === "murtazaarshad499@gmail.com";

    await db.execute(sql`
      INSERT INTO users (id, email, first_name, last_name, role, onboarded, created_at, updated_at)
      VALUES (
        ${user.id},
        ${email},
        ${firstName || null},
        ${lastName},
        ${isSuperAdmin ? "super_admin" : "agent"},
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        email      = EXCLUDED.email,
        first_name = COALESCE(EXCLUDED.first_name, users.first_name),
        last_name  = COALESCE(EXCLUDED.last_name,  users.last_name),
        role       = CASE WHEN EXCLUDED.email = 'murtazaarshad499@gmail.com' THEN 'super_admin' ELSE users.role END,
        onboarded  = true,
        updated_at = NOW()
    `);

    // ── Step 3: Auto-create org on first login (all users) ────
    // Only create if the user doesn't already own or belong to an org
    const existingOwner = await db.execute(sql`SELECT id FROM organizations WHERE owner_id = ${user.id} LIMIT 1`);
    if (!existingOwner.rows.length) {
      const existingMember = await db.execute(sql`SELECT organization_id FROM users WHERE id = ${user.id} AND organization_id IS NOT NULL LIMIT 1`);
      if (!existingMember.rows.length) {
        // Derive display name for org
        const orgName = isSuperAdmin
          ? "LuxeState Admin"
          : (firstName ? `${firstName}'s Workspace` : (email.split("@")[0] + "'s Workspace"));
        const plan = isSuperAdmin ? "agency" : "trial";
        const status = isSuperAdmin ? "active" : "trial";
        await db.execute(sql`
          INSERT INTO organizations (name, owner_id, plan, subscription_status, is_internal, created_at, updated_at)
          VALUES (${orgName}, ${user.id}, ${plan}, ${status}, ${isSuperAdmin}, NOW(), NOW())
        `).catch((err: any) => logger.error({ err }, "requireAuth: org auto-create failed"));
      }
    }
  } catch (err) {
    logger.error({ err }, "requireAuth: DB upsert failed");
    return res.status(500).json({ error: "Server error during authentication" });
  }

  next();
}
