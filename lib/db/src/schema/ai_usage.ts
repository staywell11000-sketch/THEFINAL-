import { pgTable, serial, integer, varchar, real, timestamp } from "drizzle-orm/pg-core";

export const aiUsage = pgTable("ai_usage", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id"),
  userId: varchar("user_id", { length: 255 }).notNull(),
  feature: varchar("feature", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull().default("gpt-4o-mini"),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  estimatedCost: real("estimated_cost").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AiUsage = typeof aiUsage.$inferSelect;
export type NewAiUsage = typeof aiUsage.$inferInsert;
