"use client";

import { useState } from "react";
import { Button } from "@/components/admin/ui";
import { formatDayMonth } from "@/lib/format";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useFlybyGate } from "@/components/useLoadingGate";
import type { SurveyReportContent } from "@/lib/report/generate";

export type SurveyReportRow = {
  id: string;
  content: SurveyReportContent;
  respondent_count: number;
  created_at: string;
  published: boolean;
};

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
  surveySlug,
  initialReport,
  initialPublishPublic,
  completedInterviewCount,
  canGenerate = true,
  canPublish = true,
}: {
  surveyId: string;
  surveySlug: string;
  initialReport: SurveyReportRow | null;
  initialPublishPublic: boolean;
  completedInterviewCount: number;
  // From can(role, "report:generate") / can(role, "report:publish") on the
  // server. Copy stays available to everyone: it reads, it does not write.
  canGenerate?: boolean;
  canPublish?: boolean;
}) {
  const [report, setReport] = useState<SurveyReportRow | null>(initialReport);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Both gates move together from this one control: publishing to the
  // library is the only reason to set either, so there is no admin state
  // where they usefully disagree.
  const [isPublic, setIsPublic] = useState(initialPublishPublic && (initialReport?.published ?? false));
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const showFlyby = useFlybyGate(generating, "report-generation");

  const enoughInterviews = completedInterviewCount >= 3;

  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch(`/api/surveys/${surveyId}/report`, { method: "POST" });
      // A failure that never reached the route (a platform timeout, a proxy
      // error) answers with HTML, and blindly parsing that as JSON turns a
      // real diagnosis into "Unexpected token '<'". Parse defensively and
      // fall back to the status.
      const body = await res.text();
      let data: { error?: string; report?: SurveyReportRow } = {};
      try {
        data = JSON.parse(body);
      } catch {
        if (res.ok) throw new Error("The server returned a response we could not read.");
      }
      if (!res.ok) {
        throw new Error(data.error || `Report generation failed (HTTP ${res.status}).`);
      }
      setReport(data.report ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  async function handleTogglePublic(next: boolean) {
    setPublishing(true);
    setPublishError(null);
    // Optimistic, then reverted on failure: the switch is the only feedback
    // the control has, so leaving it stale while the request is in flight
    // reads as a dead toggle.
    setIsPublic(next);
    try {
      const res = await fetch(`/api/surveys/${surveyId}/report/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicLibrary: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Publish failed (HTTP ${res.status}).`);
      }
    } catch (err) {
      setIsPublic(!next);
      setPublishError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPublishing(false);
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
    <section>
      {showFlyby && <LoadingScreen statusText="Writing your report" />}
      <div className="mb-2 flex items-center justify-between gap-6">
        <h2 className="type-eyebrow">Report</h2>
        <div className="flex items-center gap-2">
          {report && (
            <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
              {copied ? "Copied" : "Copy report"}
            </Button>
          )}
          {canGenerate && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleGenerate}
              disabled={generating || !enoughInterviews}
            >
              {generating ? "Generating" : report ? "Regenerate" : "Generate report"}
            </Button>
          )}
        </div>
      </div>

      {error && <p className="type-body-sm mb-3 text-destructive">{error}</p>}

      {!content ? (
        // The one rule the button cannot state on its own.
        <p className="type-body-sm tabular-nums text-muted-foreground">
          Reports need 3 completed interviews
          {!enoughInterviews && `. ${completedInterviewCount} of 3 so far`}.
        </p>
      ) : (
        <div className="admin-measure flex flex-col gap-5">
          <div>
            <h3 className="type-heading">{content.title}</h3>
            <p className="type-body-sm mt-1 tabular-nums text-muted-foreground">
              {report!.respondent_count} interviews · Generated {formatDayMonth(report!.created_at)}
              {content.meta && content.meta.interviews_included < content.meta.interviews_total && (
                <> · {content.meta.interviews_included} of {content.meta.interviews_total} included</>
              )}
            </p>
            {/* The shape of the report, so this page still says what was
                generated now that the body itself is not printed here. */}
            <p className="type-body-sm mt-0.5 tabular-nums text-faint">
              {content.key_themes.length} themes · {content.pain_point_frequency.length} issues ·{" "}
              {content.notable_quotes.length} quotes · {content.takeaways.length} takeaways
            </p>
          </div>

          {/* Public library control. Names the destination and states the
              two consequences a reader cannot predict: it is public, and
              respondent identities are excluded. */}
          <div className="flex items-start justify-between gap-6 border-t border-border pt-4">
            <div>
              <div className="type-body font-medium">Birdsong research library</div>
              <p className="type-body-sm mt-0.5 text-muted-foreground">
                A public page on usebirdsong.com. Respondent names, emails and companies are excluded.
              </p>
              {isPublic && (
                <a
                  href={`/reports/${surveySlug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring type-body-sm mt-1 inline-block rounded-control underline underline-offset-2"
                >
                  Open public page
                </a>
              )}
              {publishError && <p className="type-body-sm mt-1 text-destructive">{publishError}</p>}
            </div>
            {canPublish && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={publishing}
                onClick={() => handleTogglePublic(!isPublic)}
                className="shrink-0"
              >
                {publishing ? "Saving" : isPublic ? "Remove from library" : "Publish to library"}
              </Button>
            )}
          </div>

          {/* The report body used to be printed in full here. It now lives
              on the public report page, which renders the same content as a
              designed document rather than a wall of text, and "Copy report"
              still yields the whole thing as markdown. What stays here is
              what this page is actually for: generate, review the shape of
              it, publish. */}
        </div>
      )}
    </section>
  );
}
