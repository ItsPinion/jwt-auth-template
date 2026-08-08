import { Card, CardContent } from "@/components/ui/card";
import { AuthHeader } from "@/components/auth/auth-header";

interface AuthCardProps {
  title: string;
  description: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}

export function AuthCard({
  title,
  description,
  footer,
  children,
}: AuthCardProps) {
  return (
    <div className="w-full max-w-sm space-y-6 duration-500 animate-in fade-in slide-in-from-bottom-4">
      <AuthHeader title={title} description={description} />
      <Card className="shadow-lg shadow-black/[0.04] [--card-spacing:--spacing(6)]">
        <CardContent>{children}</CardContent>
      </Card>
      <p className="text-center text-sm text-muted-foreground">{footer}</p>
    </div>
  );
}
