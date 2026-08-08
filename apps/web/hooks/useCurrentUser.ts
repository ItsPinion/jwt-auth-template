"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUser } from "@/lib/auth";

export const currentUserQueryKey = ["auth", "current-user"] as const;

export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: fetchCurrentUser,
  });
}
