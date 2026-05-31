import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { leadsTable } from "./leads";
import { deals } from "./deals";

export const appointments = pgTable(
  "appointments",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    leadId: integer("lead_id").references(() => leadsTable.id, {
      onDelete: "set null",
    }),
    dealId: integer("deal_id").references(() => deals.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    dateTime: timestamp("date_time").notNull(),
    duration: integer("duration").notNull().default(60),
    location: text("location"),
    reminderAt: timestamp("reminder_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("appointments_user_idx").on(t.userId),
    index("appointments_lead_idx").on(t.leadId),
    index("appointments_deal_idx").on(t.dealId),
    index("appointments_date_time_idx").on(t.dateTime),
  ],
);

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
