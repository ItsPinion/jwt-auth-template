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

// A tiny blocklist for the most predictable choices. Real breach-list
// checking (e.g. haveibeenpwned) is worth adding before production.
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "passw0rd",
  "12345678",
  "123456789",
  "1234567890",
  "qwertyui",
  "qwerty123",
  "letmein1",
  "iloveyou",
  "admin123",
  "welcome1",
  "abc12345",
  "football",
  "baseball",
  "sunshine",
  "princess",
  "trustno1",
  "starwars",
  "superman",
  "dragon12",
  "monkey12",
  "freedom1",
]);

const registerPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  // bcrypt silently truncates at 72 bytes — cap well below that.
  .max(72, "Password must be at most 72 characters.")
  .refine(
    (password) => !COMMON_PASSWORDS.has(password.toLowerCase()),
    "This password is too common. Choose a different one.",
  );

export const registerSchema = z.object({
  email: emailSchema,
  password: registerPasswordSchema,
  // Roles are NOT self-declared: registration always creates a student.
  // Teacher (and admin) are privileged roles — the UI describes teachers as
  // being able to "create quizzes and view results" — so they must be granted
  // after verification (e.g. by an admin using the authorize middleware),
  // never picked from a public signup form.
});

export const loginSchema = z.object({
  email: emailSchema,
  // Deliberately unconstrained: policy is enforced at registration. Login
  // must keep working for accounts whose password predates a policy change.
  password: z.string().min(1, "Password is required."),
});

export type RoleType = z.infer<typeof roleSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
