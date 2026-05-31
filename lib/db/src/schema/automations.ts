import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const automations = pgTable(
  "automations",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    triggerType: varchar("trigger_type", { length: 100 }).notNull(),
    triggerConfig: jsonb("trigger_config")
      .$type<Record<string, unknown>>()
      .default({}),
    conditions: jsonb("conditions")
      .$type<
        Array<{
          field: string;
          operator: string;
          value: unknown;
        }>
      >()
      .default([]),
    actions: jsonb("actions")
      .$type<
        Array<{
          type: string;
          config: Record<string, unknown>;
        }>
      >()
      .default([]),
    isActive: boolean("is_active").notNull().default(false),
    createdById: varchar("created_by_id", { length: 255 }).references(
      () => users.id,
      { onDelete: "set null" },
    ),
    lastRunAt: timestamp("last_run_at"),
    lastRunStatus: varchar("last_run_status", { length: 50 }),
    runCount: integer("run_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("automations_is_active_idx").on(t.isActive),
    index("automations_trigger_type_idx").on(t.triggerType),
    index("automations_created_by_idx").on(t.createdById),
  ],
);

export type Automation = typeof automations.$inferSelect;
export type NewAutomation = typeof automations.$inferInsert;
