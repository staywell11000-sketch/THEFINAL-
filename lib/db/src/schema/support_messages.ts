import { pgTable, serial, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";

export const supportMessages = pgTable("support_messages", {
  id:          serial("id").primaryKey(),
  ticketId:    integer("ticket_id").notNull(),
  senderId:    varchar("sender_id", { length: 255 }).notNull(),
  senderType:  varchar("sender_type", { length: 50 }).notNull().default("user"),
  message:     text("message").notNull(),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});

export type SupportMessage = typeof supportMessages.$inferSelect;
export type NewSupportMessage = typeof supportMessages.$inferInsert;
