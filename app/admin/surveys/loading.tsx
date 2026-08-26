import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/admin/ui";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function SurveysLoading() {
  return (
    <PageShell>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-64" />
      </div>

      <div className="flex items-center gap-3">
        <Skeleton className="h-9 max-w-[300px] flex-1 rounded-control" />
        <Skeleton className="h-9 w-14 rounded-control" />
        <Skeleton className="h-9 w-14 rounded-control" />
        <Skeleton className="ml-auto h-9 w-28 rounded-control" />
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Internal name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Responses</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-14 rounded-pill" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-10" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}
