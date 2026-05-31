import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 100 }).notNull(),
    title: text("title").notNull(),
    body: text("body"),
    read: boolean("read").notNull().default(false),
    actionUrl: text("action_url"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId),
    index("notifications_read_idx").on(t.read),
    index("notifications_type_idx").on(t.type),
    index("notifications_created_at_idx").on(t.createdAt),
  ],
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
