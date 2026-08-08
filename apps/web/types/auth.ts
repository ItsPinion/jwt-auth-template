import type { RoleType } from "@repo/shared";

export interface User {
  id: string;
  email: string;
  role: RoleType;
}

export interface AuthPayload {
  accessToken: string;
}

export interface CurrentUserPayload {
  user: User;
}
