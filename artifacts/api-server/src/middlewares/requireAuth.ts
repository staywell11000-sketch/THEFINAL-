import { type Request, type Response, type NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.slice(7);

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    (req as any).userId = user.id;
    (req as any).userEmail = user.email;

    // Ensure user exists in local DB (upsert on every auth so profile stays fresh)
    const meta = (user.user_metadata ?? {}) as Record<string, string>;
    const fullName: string = meta.full_name ?? meta.name ?? "";
    const [firstName, ...rest] = fullName.split(" ");
    const lastName = rest.join(" ") || null;
    const email = user.email ?? "";

    await db.execute(sql`
      INSERT INTO users (id, email, first_name, last_name, role, created_at, updated_at)
      VALUES (
        ${user.id},
        ${email},
        ${firstName || null},
        ${lastName},
        'agent',
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        email      = EXCLUDED.email,
        first_name = COALESCE(EXCLUDED.first_name, users.first_name),
        last_name  = COALESCE(EXCLUDED.last_name,  users.last_name),
        updated_at = NOW()
    `);

    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
