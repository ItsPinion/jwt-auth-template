import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

function ProfileRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-40" />
    </div>
  );
}

export function ProfileCardSkeleton() {
  return (
    <Card className="w-full shadow-lg shadow-black/[0.04] [--card-spacing:--spacing(6)]">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Skeleton className="size-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Separator className="mb-1" />
        <div className="divide-y">
          <ProfileRowSkeleton />
          <ProfileRowSkeleton />
          <ProfileRowSkeleton />
        </div>
      </CardContent>
    </Card>
  );
}
