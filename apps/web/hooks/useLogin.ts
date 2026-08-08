"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { currentUserQueryKey } from "@/hooks/useCurrentUser";
import { login } from "@/lib/auth";

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: currentUserQueryKey });
      router.replace("/dashboard");
    },
  });
}
