import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./user";

export const refreshTokensTable = pgTable(
  "refreshTokens",
  {
    id: uuid().defaultRandom().primaryKey(),

    userId: uuid()
      .references(() => usersTable.id, {
        onDelete: "cascade",
      })
      .notNull(),

    // sha256 hex of the refresh token. Unique: one row per issued token.
    tokenHash: varchar({ length: 64 }).notNull().unique(),

    createdAt: timestamp({ mode: "date" }).defaultNow().notNull(),

    updatedAt: timestamp({ mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),

    // Sliding expiry: refreshed on rotation.
    expiresAt: timestamp({ mode: "date" }).notNull(),

    // Hard cap for the whole session lineage. Rotation extends expiresAt but
    // never this — a session dies at absoluteExpiresAt no matter how active.
    absoluteExpiresAt: timestamp({ mode: "date" })
      .default(sql`now() + interval '90 days'`)
      .notNull(),

    revokedAt: timestamp({ mode: "date" }),
  },
  (table) => ({
    userIdIdx: index("refresh_tokens_user_id_idx").on(table.userId),
  }),
);
