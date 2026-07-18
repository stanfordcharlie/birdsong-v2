import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-7 w-28" />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-24 rounded-control" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change email</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-9 w-full max-w-sm" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-9 w-full max-w-sm" />
          <Skeleton className="h-9 w-full max-w-sm" />
        </CardContent>
      </Card>
    </div>
  );
}
