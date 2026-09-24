"use client";

import { Button } from "@/components/admin/ui";
import { formatDate } from "@/lib/format";
import type { StudyListItem } from "./StudiesList";

// The list as a CSV, built in the browser from the same rows the grid
// shows. Nothing here is fetched: the page already holds every value.

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function ExportStudiesButton({ surveys }: { surveys: StudyListItem[] }) {
  function download() {
    const header = ["Title", "Status", "Length", "Responses", "Completed", "Qualified", "Created", "Last response"];
    const lines = surveys.map((s) =>
      [
        s.title,
        s.archivedAt !== null ? "archived" : s.status === "live" ? "live" : "draft",
        s.lengthSummary,
        s.responseCount,
        s.completedCount,
        s.qualifiedCount,
        formatDate(s.createdAt),
        s.lastResponseAt ? formatDate(s.lastResponseAt) : null,
      ]
        .map(csvCell)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "birdsong-studies.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="secondary" onClick={download} disabled={surveys.length === 0}>
      Export
    </Button>
  );
}
