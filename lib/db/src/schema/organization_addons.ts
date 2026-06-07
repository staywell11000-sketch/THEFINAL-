import { pgTable, serial, integer, varchar, timestamp } from "drizzle-orm/pg-core";

export const organizationAddons = pgTable("organization_addons", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  addonType: varchar("addon_type", { length: 50 }).notNull(),
  quantity: integer("quantity").notNull(),
  quantityRemaining: integer("quantity_remaining").notNull(),
  purchasedAt: timestamp("purchased_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type OrganizationAddon = typeof organizationAddons.$inferSelect;
export type NewOrganizationAddon = typeof organizationAddons.$inferInsert;
