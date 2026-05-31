import { Router, type IRouter, type Request, type Response } from "express";
import { db, documents } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { supabaseAdmin } from "../lib/supabase";

const router: IRouter = Router();
const BUCKET = "crm-documents";

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(BUCKET, { public: false });
  }
}

ensureBucket().catch(() => {});

// ── GET /documents ─────────────────────────────────────────────────────────
router.get("/documents", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const { category, leadId, dealId } = req.query;

    let rows = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.createdAt));

    if (category && category !== "all") {
      rows = rows.filter((r) => r.category === category);
    }
    if (leadId) rows = rows.filter((r) => r.leadId === Number(leadId));
    if (dealId) rows = rows.filter((r) => r.dealId === Number(dealId));

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "GET /documents failed");
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// ── GET /documents/:id ─────────────────────────────────────────────────────
router.get("/documents/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const id = Number(req.params.id);
    const [row] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "GET /documents/:id failed");
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

// ── POST /documents/signed-upload-url ─────────────────────────────────────
// Returns a signed URL so the browser can upload directly to Supabase Storage
router.post("/documents/signed-upload-url", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const { fileName, contentType } = req.body as { fileName: string; contentType: string };
    if (!fileName) { res.status(400).json({ error: "fileName is required" }); return; }

    const ext = fileName.split(".").pop() ?? "bin";
    const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(filePath);

    if (error || !data) {
      req.log.error({ error }, "Failed to create signed upload URL");
      res.status(500).json({ error: "Failed to create upload URL" });
      return;
    }

    const { data: publicData } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    res.json({
      signedUrl: data.signedUrl,
      token: data.token,
      filePath,
      publicUrl: publicData.publicUrl,
    });
  } catch (err) {
    req.log.error({ err }, "POST /documents/signed-upload-url failed");
    res.status(500).json({ error: "Failed to create upload URL" });
  }
});

// ── POST /documents ────────────────────────────────────────────────────────
// Save document metadata after the browser has completed the upload
router.post("/documents", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const { title, category, fileUrl, filePath, fileType, fileSize, dealId, leadId } =
      req.body as {
        title: string;
        category: string;
        fileUrl: string;
        filePath: string;
        fileType?: string;
        fileSize?: number;
        dealId?: number | null;
        leadId?: number | null;
      };

    if (!title || !fileUrl || !filePath) {
      res.status(400).json({ error: "title, fileUrl, and filePath are required" });
      return;
    }

    const [row] = await db
      .insert(documents)
      .values({
        userId,
        title,
        category: category ?? "other",
        fileUrl,
        filePath,
        fileType: fileType ?? null,
        fileSize: fileSize ?? null,
        dealId: dealId ?? null,
        leadId: leadId ?? null,
      })
      .returning();

    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "POST /documents failed");
    res.status(500).json({ error: "Failed to save document" });
  }
});

// ── GET /documents/:id/download-url ───────────────────────────────────────
// Returns a 60-minute signed download URL
router.get("/documents/:id/download-url", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const id = Number(req.params.id);
    const [row] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(row.filePath, 3600);

    if (error || !data) {
      res.status(500).json({ error: "Failed to create download URL" });
      return;
    }
    res.json({ url: data.signedUrl });
  } catch (err) {
    req.log.error({ err }, "GET /documents/:id/download-url failed");
    res.status(500).json({ error: "Failed to create download URL" });
  }
});

// ── DELETE /documents/:id ─────────────────────────────────────────────────
router.delete("/documents/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const id = Number(req.params.id);
    const [row] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }

    await supabaseAdmin.storage.from(BUCKET).remove([row.filePath]);
    await db.delete(documents).where(eq(documents.id, id));

    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "DELETE /documents/:id failed");
    res.status(500).json({ error: "Failed to delete document" });
  }
});

export default router;
