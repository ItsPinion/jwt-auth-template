import { BookOpenCheck } from "lucide-react";
import Link from "next/link";

export function DashboardHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
        <Link
          href="/dashboard"
          aria-label="Quizz dashboard"
          className="group flex items-center gap-2 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-b from-primary to-primary/80 text-primary-foreground shadow-sm shadow-primary/25">
            <BookOpenCheck className="size-3.5" aria-hidden="true" />
          </span>
          <span className="font-semibold tracking-tight">Quizz</span>
        </Link>
        {children}
      </div>
    </header>
  );
}
