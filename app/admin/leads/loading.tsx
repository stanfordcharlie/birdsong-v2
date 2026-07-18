import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function LeadsLoading() {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-7 w-52" />
      </div>

      <div className="flex items-center gap-3">
        <Skeleton className="h-9 max-w-[320px] flex-1 rounded-control" />
        <Skeleton className="h-8 w-12 rounded-control" />
        <Skeleton className="h-8 w-14 rounded-control" />
        <Skeleton className="h-8 w-20 rounded-control" />
        <Skeleton className="h-8 w-16 rounded-control" />
        <Skeleton className="h-9 w-32 rounded-control" />
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Survey</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Top pain point</TableHead>
              <TableHead>Completed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-28" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-9 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-9 w-28 rounded-control" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-44" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-14" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
