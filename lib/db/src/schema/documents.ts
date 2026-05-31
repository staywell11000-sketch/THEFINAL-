import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const documents = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    dealId: integer("deal_id"),
    leadId: integer("lead_id"),
    title: text("title").notNull(),
    category: varchar("category", { length: 50 }).notNull().default("other"),
    fileUrl: text("file_url").notNull(),
    filePath: text("file_path").notNull(),
    fileType: varchar("file_type", { length: 50 }),
    fileSize: integer("file_size"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("documents_user_idx").on(t.userId),
    index("documents_category_idx").on(t.category),
    index("documents_deal_idx").on(t.dealId),
    index("documents_lead_idx").on(t.leadId),
  ]
);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
