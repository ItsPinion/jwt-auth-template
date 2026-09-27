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
  role: roleSchema.exclude(["admin"]).optional().default("student"),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type RoleType = z.infer<typeof roleSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
