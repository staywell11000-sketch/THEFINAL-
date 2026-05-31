import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").default(""),
  whatsappNumber: text("whatsapp_number").default(""),
  interestedProperties: text("interested_properties").array().default([]),
  property: text("property").default(""),
  budget: text("budget").default(""),
  status: text("status").notNull().default("new"),
  priority: text("priority").notNull().default("warm"),
  source: text("source").default("Website"),
  assignedTo: text("assigned_to").default(""),
  lastContact: text("last_contact").default(""),
  avatar: text("avatar").default(""),
  notes: text("notes").array().default([]),
  timeline: jsonb("timeline").$type<Array<{ id: string; title: string; time: string }>>().default([]),
  score: integer("score").default(50),
  urgencyScore: integer("urgency_score").default(50),
  tags: text("tags").array().default([]),
  reminder: jsonb("reminder").$type<{ date: string; note: string } | null>(),
  attachments: jsonb("attachments").$type<Array<{ name: string; size: string; type: "pdf" | "doc" | "img" | "other" }>>().default([]),
  duplicateOf: integer("duplicate_of"),
  campaign: text("campaign"),
  adSource: text("ad_source"),
  adSetName: text("ad_set_name"),
  adCreativeId: text("ad_creative_id"),
  externalId: text("external_id"),
  aiSummary: text("ai_summary"),
  suggestedActions: text("suggested_actions").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type DbLead = typeof leadsTable.$inferSelect;
