"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { currentUserQueryKey } from "@/hooks/useCurrentUser";
import { register } from "@/lib/auth";

export function useRegister() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: register,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: currentUserQueryKey });
      router.replace("/dashboard");
    },
  });
}
