import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";
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

    tokenHash: varchar({ length: 64 }).notNull(),

    createdAt: timestamp({ mode: "date" }).defaultNow().notNull(),

    updatedAt: timestamp({ mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),

    expiresAt: timestamp({ mode: "date" }).notNull(),

    revokedAt: timestamp({ mode: "date" }),
  },
  (table) => ({
    tokenHashIdx: index("refresh_token_hash_idx").on(table.tokenHash),
  }),
);
