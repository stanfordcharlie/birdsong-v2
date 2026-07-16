import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  // surveys_public_read (RLS) intentionally allows anyone to read any
  // survey, since the unauthenticated respondent flow needs to look one up
  // by slug. That means an unfiltered select here would return every
  // admin's surveys, not just the current one's, so ownership has to be
  // filtered explicitly rather than left to RLS.
  const { data: surveys, error } = await supabase
    .from("surveys")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-card-foreground">Your Surveys</h1>
        <Button asChild>
          <Link href="/admin/surveys/new">New survey</Link>
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {!error && (!surveys || surveys.length === 0) && (
        <p className="text-sm text-muted-foreground">No surveys yet.</p>
      )}

      {surveys && surveys.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Internal name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {surveys.map((survey) => (
                <TableRow key={survey.id} className="relative">
                  <TableCell>
                    <Link
                      href={`/admin/surveys/${survey.id}`}
                      className="font-medium text-card-foreground hover:text-primary"
                    >
                      {/* Stretches to fill the whole row (position:relative
                          on TableRow above), so anywhere in the row is
                          clickable, not just this text. */}
                      <span className="absolute inset-0" />
                      {survey.title}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {survey.slug}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(survey.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
