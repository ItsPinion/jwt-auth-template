import { z } from "zod";

export const roles = ["student", "teacher", "admin"] as const;
export const roleSchema = z.enum(roles);

const emailSchema = z.email("Enter a valid email address.");
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
