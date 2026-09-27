"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { LogoutAllButton } from "@/components/dashboard/logout-all-button";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { ProfileCard } from "@/components/dashboard/profile-card";
import { ProfileCardSkeleton } from "@/components/dashboard/profile-card-skeleton";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function DashboardPage() {
  const router = useRouter();
  const { data: user, isPending, isError } = useCurrentUser();

  useEffect(() => {
    if (isError) {
      router.replace("/login");
    }
  }, [isError, router]);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-radial-fade" />
      <DashboardHeader>
        <div className="flex items-center gap-1">
          <LogoutAllButton />
          <LogoutButton />
        </div>
      </DashboardHeader>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Your account overview. Quiz features are coming soon.
          </p>
        </div>
        {isPending || isError ? (
          <ProfileCardSkeleton />
        ) : (
          <ProfileCard user={user} />
        )}
      </main>
    </div>
  );
}
