/**
 * Role-based access control. Not mounted by default — apply it after `auth`
 * on routes that should be role-gated, e.g.:
 *
 *   router.get("/admin/stats", auth, authorize("admin"), handler);
 *
 * Roles are never self-declared at registration (see registerSchema), so the
 * roles checked here are ones an admin granted after verification.
 */
import type { RoleType } from "@repo/shared";
import type { NextFunction, Request, Response } from "express";

export function authorize(...roles: RoleType[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    next();
  };
}