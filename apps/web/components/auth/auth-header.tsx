import Link from "next/link";
import { BookOpenCheck } from "lucide-react";

interface AuthHeaderProps {
  title: string;
  description: string;
}

export function AuthHeader({ title, description }: AuthHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <Link
        href="/"
        aria-label="Quizz home"
        className="group flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-b from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/25 transition-transform duration-200 group-hover:scale-105">
          <BookOpenCheck className="size-4.5" aria-hidden="true" />
        </span>
        <span className="text-lg font-semibold tracking-tight">Quizz</span>
      </Link>
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight text-balance">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground text-balance">
          {description}
        </p>
      </div>
    </div>
  );
}
