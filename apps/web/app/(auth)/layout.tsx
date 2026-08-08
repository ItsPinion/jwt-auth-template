"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const { data: user } = useCurrentUser();

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grid-fade" />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-radial-fade"
      />
      {children}
    </main>
  );
}
