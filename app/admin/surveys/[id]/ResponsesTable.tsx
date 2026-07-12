import Link from "next/link";
import type { Database } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ResponseRow = Database["public"]["Tables"]["responses"]["Row"];

// Each row links to the full response detail page (call script, status,
// summary, transcript) rather than expanding inline, since that page now
// shows far more than a table row reasonably could.
export function ResponsesTable({ responses }: { responses: ResponseRow[] }) {
  if (responses.length === 0) {
    return <p className="text-sm text-muted-foreground">No responses yet.</p>;
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Lead score</TableHead>
            <TableHead>Completed</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {responses.map((r) => (
            <TableRow key={r.id} className="relative">
              <TableCell className="text-card-foreground">
                <Link
                  href={`/admin/responses/${r.id}`}
                  className="font-medium text-card-foreground hover:text-primary"
                >
                  {/* Stretches to fill the whole row (position:relative on
                      TableRow above), so anywhere in the row is clickable. */}
                  <span className="absolute inset-0" />
                  {r.respondent_name || "—"}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{r.respondent_email || "—"}</TableCell>
              <TableCell>
                <Badge variant="default">{r.lead_score ?? "—"}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={r.completed ? "success" : "default"}>
                  {r.completed ? "Yes" : "No"}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(r.created_at).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
