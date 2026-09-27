import { z } from "zod";

export const roles = ["student", "teacher", "admin"] as const;
export const roleSchema = z.enum(roles);

/** Canonical form used for storage and lookups: trimmed + lowercased. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const emailSchema = z
  .email("Enter a valid email address.")
  .transform(normalizeEmail);
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  // Roles are NOT self-declared: registration always creates a student.
  // Teacher (and admin) are privileged roles — the UI describes teachers as
  // being able to "create quizzes and view results" — so they must be granted
  // after verification (e.g. by an admin using the authorize middleware),
  // never picked from a public signup form.
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type RoleType = z.infer<typeof roleSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
