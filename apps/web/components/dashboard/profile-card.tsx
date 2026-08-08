import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { User } from "@/types";

interface ProfileCardProps {
  user: User;
}

function ProfileRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium">{children}</dd>
    </div>
  );
}

export function ProfileCard({ user }: ProfileCardProps) {
  return (
    <Card className="w-full shadow-lg shadow-black/[0.04] duration-500 animate-in fade-in slide-in-from-bottom-4 [--card-spacing:--spacing(6)]">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="size-12 border">
            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary uppercase">
              {user.email.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-0.5">
            <CardTitle className="text-lg">Welcome back</CardTitle>
            <CardDescription className="truncate">
              {user.email}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Separator className="mb-1" />
        <dl className="divide-y">
          <ProfileRow label="Email">
            <span className="truncate">{user.email}</span>
          </ProfileRow>
          <ProfileRow label="Role">
            <Badge variant="secondary" className="capitalize">
              {user.role}
            </Badge>
          </ProfileRow>
          <ProfileRow label="User ID">
            <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
              {user.id}
            </code>
          </ProfileRow>
        </dl>
      </CardContent>
    </Card>
  );
}
