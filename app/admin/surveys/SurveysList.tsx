"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
    return <p className="text-sm text-muted-foreground">No surveys yet.</p>;
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
                  "rounded-control border px-3.5 py-1.5 text-xs font-medium transition-colors",
                  // No existing token covers "active filter chip" (a new
                  // pattern this page introduces), so this one pairing is
                  // literal per the handoff rather than token-backed.
                  active
                    ? "border-[#18181b] bg-[#18181b] text-white"
                    : "border-border bg-card text-card-foreground hover:bg-secondary"
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Internal name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Responses</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  No surveys match your search.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((survey) => (
                <TableRow key={survey.id} className="relative">
                  <TableCell>
                    <Link href={`/admin/surveys/${survey.id}`} className="font-medium text-primary">
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
                  <TableCell className="text-sm text-muted-foreground">{survey.slug}</TableCell>
                  <TableCell className="text-card-foreground">{survey.responseCount}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
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
