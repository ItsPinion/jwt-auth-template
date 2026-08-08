"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useLogout } from "@/hooks/useLogout";

export function LogoutButton() {
  const logout = useLogout();

  return (
    <Button
      variant="outline"
      onClick={() => logout.mutate()}
      disabled={logout.isPending}
    >
      {logout.isPending ? (
        <>
          <Spinner />
          Logging out...
        </>
      ) : (
        <>
          <LogOut aria-hidden="true" />
          Log out
        </>
      )}
    </Button>
  );
}
