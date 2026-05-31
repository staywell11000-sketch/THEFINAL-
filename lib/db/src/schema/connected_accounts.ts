import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const connectedAccounts = pgTable(
  "connected_accounts",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 100 }).notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    displayName: text("display_name"),
    email: text("email"),
    avatarUrl: text("avatar_url"),
    scopes: text("scopes").array().default([]),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("connected_accounts_user_provider_account_idx").on(
      t.userId,
      t.provider,
      t.providerAccountId,
    ),
    index("connected_accounts_user_idx").on(t.userId),
    index("connected_accounts_provider_idx").on(t.provider),
  ],
);

export type ConnectedAccount = typeof connectedAccounts.$inferSelect;
export type NewConnectedAccount = typeof connectedAccounts.$inferInsert;
