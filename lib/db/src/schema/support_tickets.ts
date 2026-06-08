import { pgTable, serial, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";

export const supportTickets = pgTable("support_tickets", {
  id:             serial("id").primaryKey(),
  organizationId: integer("organization_id"),
  userId:         varchar("user_id", { length: 255 }).notNull(),
  subject:        varchar("subject", { length: 500 }).notNull(),
  message:        text("message").notNull(),
  status:         varchar("status", { length: 50 }).notNull().default("open"),
  priority:       varchar("priority", { length: 50 }).notNull().default("normal"),
  createdAt:      timestamp("created_at").defaultNow().notNull(),
  updatedAt:      timestamp("updated_at").defaultNow().notNull(),
  resolvedAt:     timestamp("resolved_at"),
});

export type SupportTicket = typeof supportTickets.$inferSelect;
export type NewSupportTicket = typeof supportTickets.$inferInsert;
