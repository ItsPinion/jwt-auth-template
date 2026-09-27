"use client";

import { MonitorX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useLogoutAll } from "@/hooks/useLogout";

export function LogoutAllButton() {
  const logoutAll = useLogoutAll();

  return (
    <Button
      variant="ghost"
      onClick={() => logoutAll.mutate()}
      disabled={logoutAll.isPending}
    >
      {logoutAll.isPending ? (
        <>
          <Spinner />
          Signing out...
        </>
      ) : (
        <>
          <MonitorX aria-hidden="true" />
          Sign out everywhere
        </>
      )}
    </Button>
  );
}
