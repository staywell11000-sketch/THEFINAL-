import { type Request, type Response, type NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase";

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
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
