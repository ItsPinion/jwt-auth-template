import { roles } from "@repo/shared";
import { sql } from "drizzle-orm";
import { pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", roles);

export const usersTable = pgTable("users", {
  id: uuid().defaultRandom().primaryKey(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: varchar({ length: 255 }).notNull(),
  role: roleEnum().default("student").notNull(),
  createdAt: timestamp({ mode: "date" }).default(sql`now()`).notNull(),
  updatedAt: timestamp({ mode: "date" })
    .default(sql`now()`)
    .$onUpdate(() => new Date())
    .notNull(),
});
