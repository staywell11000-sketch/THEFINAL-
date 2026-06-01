import { db, notifications } from "@workspace/db";
import { sql } from "drizzle-orm";

type NotificationType = "lead" | "message" | "reminder" | "deal" | "property" | "team" | "system";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      actionUrl: params.actionUrl ?? null,
      metadata: params.metadata ?? null,
      read: false,
    });
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}

export async function createNotificationForAllAdmins(
  params: Omit<CreateNotificationParams, "userId">
): Promise<void> {
  try {
    const result = await db.execute<{ id: string }>(sql`SELECT id FROM users LIMIT 20`);
    const userIds = result.rows.map((r) => r.id);
    if (userIds.length === 0) return;
    await Promise.all(userIds.map((uid) => createNotification({ ...params, userId: uid })));
  } catch (err) {
    console.error("Failed to broadcast notification:", err);
  }
}
