import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { automations } from "./automations";
import { leadsTable } from "./leads";

export const automationLogs = pgTable(
  "automation_logs",
  {
    id: serial("id").primaryKey(),
    automationId: integer("automation_id")
      .notNull()
      .references(() => automations.id, { onDelete: "cascade" }),
    leadId: integer("lead_id").references(() => leadsTable.id, {
      onDelete: "set null",
    }),
    triggerType: varchar("trigger_type", { length: 100 }).notNull(),
    status: varchar("status", { length: 50 }).notNull().default("success"),
    actionsExecuted: jsonb("actions_executed")
      .$type<Array<{ type: string; result: string; error?: string }>>()
      .default([]),
    triggerData: jsonb("trigger_data").$type<Record<string, unknown>>().default({}),
    errorMessage: text("error_message"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("automation_logs_automation_idx").on(t.automationId),
    index("automation_logs_lead_idx").on(t.leadId),
    index("automation_logs_status_idx").on(t.status),
    index("automation_logs_created_at_idx").on(t.createdAt),
  ],
);

export type AutomationLog = typeof automationLogs.$inferSelect;
export type NewAutomationLog = typeof automationLogs.$inferInsert;
