"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { SurveyReportContent } from "@/lib/report/generate";

export type SurveyReportRow = {
  id: string;
  content: SurveyReportContent;
  respondent_count: number;
  created_at: string;
};

function formatGeneratedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Plain-text/markdown rendition for pasting into a doc.
function reportToMarkdown(content: SurveyReportContent, respondentCount: number): string {
  const lines: string[] = [
    `# ${content.title}`,
    "",
    `_Based on ${respondentCount} interviews._`,
    "",
    "## Executive summary",
    "",
    content.executive_summary,
    "",
  ];
  for (const theme of content.key_themes) {
    lines.push(`## ${theme.heading}`, "", theme.paragraph, "");
    for (const point of theme.supporting_points) lines.push(`- ${point}`);
    lines.push("");
  }
  if (content.pain_point_frequency.length > 0) {
    lines.push("## Pain point frequency", "");
    content.pain_point_frequency.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.pain_point} (${p.respondent_count} of ${respondentCount} respondents)`);
    });
    lines.push("");
  }
  if (content.notable_quotes.length > 0) {
    lines.push("## Notable quotes", "");
    for (const q of content.notable_quotes) lines.push(`> "${q.quote}" — ${q.attribution}`, "");
  }
  lines.push("## Takeaways", "");
  for (const t of content.takeaways) lines.push(`- ${t}`);
  return lines.join("\n");
}

export function ReportSection({
  surveyId,
  initialReport,
  completedInterviewCount,
}: {
  surveyId: string;
  initialReport: SurveyReportRow | null;
  completedInterviewCount: number;
}) {
  const [report, setReport] = useState<SurveyReportRow | null>(initialReport);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const enoughInterviews = completedInterviewCount >= 3;

  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch(`/api/surveys/${surveyId}/report`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Report generation failed");
      setReport(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!report) return;
    await navigator.clipboard.writeText(reportToMarkdown(report.content, report.respondent_count));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const content = report?.content;

  return (
    <div className="border-t border-border py-8">
      <div className="mb-3.5 flex items-baseline justify-between gap-6">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-card-foreground">Report</h2>
        <div className="flex items-center gap-2.5">
          {report && (
            <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy report"}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={handleGenerate}
            disabled={generating || !enoughInterviews}
          >
            {generating ? "Generating… this takes a moment" : report ? "Regenerate" : "Generate report"}
          </Button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {!content ? (
        <p className="max-w-[620px] text-sm text-muted-foreground">
          Turn this survey&apos;s interviews into an industry report draft: themes, pain point
          frequency, and quotable moments, written from what respondents actually said. Reports need
          at least 3 completed interviews
          {!enoughInterviews && ` — ${completedInterviewCount} of 3 so far`}.
        </p>
      ) : (
        <div className="flex max-w-[680px] flex-col gap-7">
          <div>
            <h3 className="font-serif text-[26px] font-normal leading-[1.25] text-card-foreground">
              {content.title}
            </h3>
            <p className="mt-1.5 text-[13px] text-faint">
              Based on {report!.respondent_count} interviews · Generated{" "}
              {formatGeneratedDate(report!.created_at)}
              {content.meta && content.meta.interviews_included < content.meta.interviews_total && (
                <> · Includes {content.meta.interviews_included} of {content.meta.interviews_total} interviews</>
              )}
            </p>
          </div>

          <p className="text-[16px] leading-[1.65] text-card-foreground">{content.executive_summary}</p>

          {content.key_themes.map((theme, i) => (
            <div key={i}>
              <h4 className="mb-2 text-[16px] font-semibold text-card-foreground">{theme.heading}</h4>
              <p className="mb-3 text-[15px] leading-[1.65] text-card-foreground">{theme.paragraph}</p>
              {theme.supporting_points.length > 0 && (
                <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
                  {theme.supporting_points.map((point, j) => (
                    <li key={j}>{point}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {content.pain_point_frequency.length > 0 && (
            <div>
              <h4 className="mb-3 text-[16px] font-semibold text-card-foreground">Pain point frequency</h4>
              <div className="flex flex-col">
                {content.pain_point_frequency.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-baseline justify-between gap-6 border-b border-chip py-2.5 last:border-b-0"
                  >
                    <span className="flex gap-4 text-sm text-card-foreground">
                      <span className="min-w-[22px] text-[13px] font-semibold text-faint">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {p.pain_point}
                    </span>
                    <span className="whitespace-nowrap text-[13px] text-muted-foreground">
                      {p.respondent_count} of {report!.respondent_count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {content.notable_quotes.length > 0 && (
            <div className="flex flex-col gap-4">
              <h4 className="text-[16px] font-semibold text-card-foreground">Notable quotes</h4>
              {content.notable_quotes.map((q, i) => (
                <blockquote key={i} className="border-l-2 border-primary pl-4">
                  <p className="font-serif text-[17px] leading-[1.5] text-card-foreground">
                    &ldquo;{q.quote}&rdquo;
                  </p>
                  <footer className="mt-1 text-[13px] text-muted-foreground">{q.attribution}</footer>
                </blockquote>
              ))}
            </div>
          )}

          {content.takeaways.length > 0 && (
            <div>
              <h4 className="mb-2 text-[16px] font-semibold text-card-foreground">Takeaways</h4>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px] text-card-foreground">
                {content.takeaways.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
