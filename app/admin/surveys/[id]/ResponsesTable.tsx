"use client";

import { Fragment, useState } from "react";
import type { Database } from "@/types/database";
import type { InterviewMessage } from "@/lib/interview/types";
import { parseCustomRespondentFieldDefs, parsePresetFieldLabel } from "@/lib/surveys/respondent-fields";
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

export function ResponsesTable({
  responses,
  surveyCustomFields = [],
}: {
  responses: ResponseRow[];
  surveyCustomFields?: unknown;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // job_title/company/linkedin are presets stored in custom_field_values
  // under those exact keys (using whatever label the admin set, or the
  // default); admin-defined fields use their own generated keys. Both need
  // a human label when displaying a response.
  const customFieldLabels: Record<string, string> = {
    job_title: parsePresetFieldLabel(surveyCustomFields, "job_title"),
    company: parsePresetFieldLabel(surveyCustomFields, "company"),
    linkedin: parsePresetFieldLabel(surveyCustomFields, "linkedin"),
    ...Object.fromEntries(
      parseCustomRespondentFieldDefs(surveyCustomFields).map((field) => [field.key, field.label])
    ),
  };

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
          {responses.map((r) => {
            const isExpanded = expandedId === r.id;
            const messages = (r.messages as unknown as InterviewMessage[] | null) ?? [];
            const painPoints = (r.pain_points as unknown as string[] | null) ?? [];
            const customValues = (r.custom_field_values as Record<string, unknown> | null) ?? {};
            const extraInfo = [
              r.respondent_phone ? `Phone: ${r.respondent_phone}` : null,
              ...Object.entries(customValues)
                .filter((entry): entry is [string, string] => typeof entry[1] === "string")
                .map(([key, value]) => `${customFieldLabels[key] ?? key}: ${value}`),
            ].filter(Boolean);

            return (
              <Fragment key={r.id}>
                <TableRow
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  className="cursor-pointer"
                >
                  <TableCell className="text-card-foreground">
                    {r.respondent_name || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.respondent_email || "—"}
                  </TableCell>
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
                {isExpanded && (
                  <TableRow>
                    <TableCell colSpan={5} className="bg-secondary/50">
                      <div className="flex flex-col gap-4">
                        {extraInfo.length > 0 && (
                          <p className="text-sm text-muted-foreground">{extraInfo.join(" · ")}</p>
                        )}
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Pain points
                          </h3>
                          {painPoints.length > 0 ? (
                            <ul className="mt-1 list-disc pl-5 text-sm text-card-foreground">
                              {painPoints.map((p, i) => (
                                <li key={i}>{p}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-1 text-sm text-muted-foreground">None extracted.</p>
                          )}
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Transcript
                          </h3>
                          <div className="mt-1 flex flex-col gap-2">
                            {messages.map((m, i) => (
                              <div key={i} className="text-sm text-card-foreground">
                                <span className="font-medium">
                                  {m.role === "assistant" ? "Interviewer: " : "Respondent: "}
                                </span>
                                {m.content}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
