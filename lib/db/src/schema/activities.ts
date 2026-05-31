import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { leadsTable } from "./leads";
import { deals } from "./deals";
import { properties } from "./properties";

export const activities = pgTable(
  "activities",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    leadId: integer("lead_id").references(() => leadsTable.id, {
      onDelete: "cascade",
    }),
    dealId: integer("deal_id").references(() => deals.id, {
      onDelete: "cascade",
    }),
    propertyId: integer("property_id").references(() => properties.id, {
      onDelete: "cascade",
    }),
    type: varchar("type", { length: 100 }).notNull(),
    title: text("title").notNull(),
    description: text("description"),
    outcome: text("outcome"),
    duration: integer("duration"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    scheduledAt: timestamp("scheduled_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("activities_user_idx").on(t.userId),
    index("activities_lead_idx").on(t.leadId),
    index("activities_deal_idx").on(t.dealId),
    index("activities_property_idx").on(t.propertyId),
    index("activities_type_idx").on(t.type),
    index("activities_scheduled_at_idx").on(t.scheduledAt),
    index("activities_created_at_idx").on(t.createdAt),
  ],
);

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
