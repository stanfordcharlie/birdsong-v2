"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type SurveyListItem = {
  id: string;
  title: string;
  slug: string;
  status: string;
  responseCount: number;
  createdAt: string;
};

type StatusFilter = "all" | "live";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
];

export function SurveysList({ surveys }: { surveys: SurveyListItem[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return surveys.filter((survey) => {
      if (statusFilter === "live" && survey.status !== "live") return false;
      if (q && !survey.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [surveys, query, statusFilter]);

  if (surveys.length === 0) {
    return (
      <Card className="flex flex-col items-start gap-3 p-8">
        <p className="text-sm text-card-foreground">
          No surveys yet. Create one and Wren starts interviewing the moment you share the link —
          every completed conversation comes back scored, with a call script ready.
        </p>
        <Button asChild>
          <Link href="/admin/surveys/new">Create your first survey</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="max-w-[320px] flex-1">
          <Input
            type="text"
            placeholder="Search surveys"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map((filter) => {
            const active = statusFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                aria-pressed={active}
                className={cn(
                  // h-9 matches the Input and Button defaults so the whole
                  // controls row sits on one consistent height.
                  "flex h-9 items-center rounded-control border px-3.5 text-[13px] font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-transparent text-muted-foreground hover:bg-secondary"
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
        <Button asChild className="ml-auto">
          <Link href="/admin/surveys/new">New survey</Link>
        </Button>
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
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  No surveys match your search.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((survey) => (
                <TableRow key={survey.id} className="relative">
                  <TableCell>
                    <Link href={`/admin/surveys/${survey.id}`} className="text-[15px] font-medium text-card-foreground">
                      {/* Stretches to fill the whole row (position:relative
                          on TableRow above), so anywhere in the row is
                          clickable, not just this text. */}
                      <span className="absolute inset-0" />
                      {survey.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={survey.status === "live" ? "success" : "warning"}>
                      {survey.status === "live" ? "Live" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-card-foreground">{survey.responseCount}</TableCell>
                  <TableCell className="text-sm text-card-foreground">
                    {new Date(survey.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
