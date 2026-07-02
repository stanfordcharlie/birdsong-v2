"use client";

import { Fragment, useState } from "react";
import type { Database } from "@/types/database";
import type { InterviewMessage } from "@/lib/interview/types";

type ResponseRow = Database["public"]["Tables"]["responses"]["Row"];

export function ResponsesTable({ responses }: { responses: ResponseRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (responses.length === 0) {
    return <p className="text-sm text-neutral-500">No responses yet.</p>;
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b text-left">
          <th className="py-2 pr-4">Name</th>
          <th className="py-2 pr-4">Email</th>
          <th className="py-2 pr-4">Lead score</th>
          <th className="py-2 pr-4">Completed</th>
          <th className="py-2 pr-4">Created</th>
        </tr>
      </thead>
      <tbody>
        {responses.map((r) => {
          const isExpanded = expandedId === r.id;
          const messages = (r.messages as unknown as InterviewMessage[] | null) ?? [];
          const painPoints = (r.pain_points as unknown as string[] | null) ?? [];
          const customValues = (r.custom_field_values as Record<string, unknown> | null) ?? {};
          const extraInfo = [
            r.respondent_phone ? `Phone: ${r.respondent_phone}` : null,
            typeof customValues.job_title === "string" ? `Job title: ${customValues.job_title}` : null,
            typeof customValues.company === "string" ? `Company: ${customValues.company}` : null,
          ].filter(Boolean);

          return (
            <Fragment key={r.id}>
              <tr
                onClick={() => setExpandedId(isExpanded ? null : r.id)}
                className="cursor-pointer border-b hover:bg-neutral-50"
              >
                <td className="py-2 pr-4">{r.respondent_name || "—"}</td>
                <td className="py-2 pr-4">{r.respondent_email || "—"}</td>
                <td className="py-2 pr-4">{r.lead_score ?? "—"}</td>
                <td className="py-2 pr-4">{r.completed ? "Yes" : "No"}</td>
                <td className="py-2 pr-4">{new Date(r.created_at).toLocaleString()}</td>
              </tr>
              {isExpanded && (
                <tr className="border-b bg-neutral-50">
                  <td colSpan={5} className="px-4 py-4">
                    <div className="flex flex-col gap-4">
                      {extraInfo.length > 0 && (
                        <p className="text-sm text-neutral-600">{extraInfo.join(" · ")}</p>
                      )}
                      <div>
                        <h3 className="text-xs font-semibold uppercase text-neutral-500">
                          Pain points
                        </h3>
                        {painPoints.length > 0 ? (
                          <ul className="mt-1 list-disc pl-5 text-sm">
                            {painPoints.map((p, i) => (
                              <li key={i}>{p}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-sm text-neutral-500">None extracted.</p>
                        )}
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold uppercase text-neutral-500">
                          Transcript
                        </h3>
                        <div className="mt-1 flex flex-col gap-2">
                          {messages.map((m, i) => (
                            <div key={i} className="text-sm">
                              <span className="font-medium">
                                {m.role === "assistant" ? "Interviewer: " : "Respondent: "}
                              </span>
                              {m.content}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
