import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { InterviewMessage } from "@/lib/interview/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusControl } from "@/components/StatusControl";
import { CopyScriptButton } from "./CopyScriptButton";
import type { VariantProps } from "class-variance-authority";

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  not_a_fit: "Not a fit",
};

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const STATUS_BADGE_VARIANT: Record<string, BadgeVariant> = {
  new: "default",
  contacted: "warning",
  qualified: "success",
  not_a_fit: "destructive",
};

// Same score bands as the lead-score badge (LeadsQueue.scoreBadgeVariant),
// reused for the company fit score so the two badges read consistently.
function fitBadgeVariant(score: number | null): BadgeVariant {
  if (score === null) return "outline";
  if (score >= 9) return "success";
  if (score >= 7) return "warning";
  if (score >= 5) return "default";
  return "outline";
}

export default async function ResponseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: response } = await supabase
    .from("responses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!response) {
    notFound();
  }

  const { data: survey } = await supabase
    .from("surveys")
    .select("id, title")
    .eq("id", response.survey_id)
    .maybeSingle();

  const customValues = (response.custom_field_values as Record<string, unknown> | null) ?? {};
  const jobTitle = typeof customValues.job_title === "string" ? customValues.job_title : null;
  const company =
    typeof customValues.company === "string"
      ? customValues.company
      : typeof customValues.derived_company_name === "string"
        ? customValues.derived_company_name
        : null;

  const messages = (response.messages as unknown as InterviewMessage[] | null) ?? [];
  const painPoints = (response.pain_points as unknown as string[] | null) ?? [];

  const rawCallScript = response.call_script as
    | { opener?: unknown; talking_points?: unknown }
    | null;
  const callScript = rawCallScript
    ? {
        opener: typeof rawCallScript.opener === "string" ? rawCallScript.opener : "",
        talkingPoints: Array.isArray(rawCallScript.talking_points)
          ? rawCallScript.talking_points.filter((p): p is string => typeof p === "string")
          : [],
      }
    : null;
  const scriptText = callScript
    ? [callScript.opener, "", ...callScript.talkingPoints.map((point) => `- ${point}`)].join("\n")
    : "";

  const rawSignals = response.signals as
    | {
        economic_buyer?: unknown;
        decision_criteria?: unknown;
        decision_process?: unknown;
        metrics?: unknown;
        champion?: unknown;
      }
    | null;
  const signals = [
    { label: "Economic buyer", value: rawSignals?.economic_buyer },
    { label: "Decision criteria", value: rawSignals?.decision_criteria },
    { label: "Decision process", value: rawSignals?.decision_process },
    { label: "Metrics", value: rawSignals?.metrics },
    { label: "Champion", value: rawSignals?.champion },
  ].filter(
    (signal): signal is { label: string; value: string } =>
      typeof signal.value === "string" && signal.value.trim().length > 0
  );

  // Company fit (lib/interview/company-fit.ts) — a separate assessment from
  // lead_score. Fields are absent until the response_company_fit migration is
  // applied, so read defensively.
  const fitScore = typeof response.fit_score === "number" ? response.fit_score : null;
  const fitReasoning = typeof response.fit_reasoning === "string" ? response.fit_reasoning : "";
  const fitConfidence = typeof response.fit_confidence === "string" ? response.fit_confidence : null;
  const fitUnavailable = fitConfidence === "unavailable";
  const fitLowData = fitConfidence === "low";

  const initial = (
    response.respondent_name?.trim()?.[0] ??
    response.respondent_email?.trim()?.[0] ??
    "?"
  ).toUpperCase();
  const status = response.status ?? "new";
  const secondaryLine = [response.respondent_email, jobTitle, company].filter(Boolean).join(" · ");

  return (
    <div className="admin-container flex flex-col gap-6">
      {survey && (
        <Link
          href={`/admin/surveys/${survey.id}`}
          className="text-sm text-muted-foreground hover:text-card-foreground"
        >
          Back to {survey.title}
        </Link>
      )}

      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {initial}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-base font-semibold text-card-foreground">
              {response.respondent_name || "Unnamed respondent"}
            </span>
            {secondaryLine && <span className="text-sm text-muted-foreground">{secondaryLine}</span>}
            {response.source && (
              <span className="text-xs text-muted-foreground">Source: {response.source}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {response.is_test && <Badge variant="warning">Test response</Badge>}
          <Badge variant="default">Lead score {response.lead_score ?? "—"}</Badge>
          {/* Company fit: a second, independent badge. lead_score = "did they
              show pain?"; fit = "is this company worth calling?". */}
          {fitUnavailable ? (
            <Badge variant="outline" title="Company fit research was unavailable for this response.">
              Fit n/a
            </Badge>
          ) : fitScore !== null ? (
            <Badge
              variant={fitBadgeVariant(fitScore)}
              title={[fitReasoning, `Confidence: ${fitConfidence}`].filter(Boolean).join(" — ")}
            >
              Fit {fitScore}
              {fitLowData ? " · limited data" : ""}
            </Badge>
          ) : (
            <Badge variant="outline" title="Company fit not yet scored.">
              Fit —
            </Badge>
          )}
          <Badge variant={STATUS_BADGE_VARIANT[status] ?? "default"}>
            {STATUS_LABELS[status] ?? status}
          </Badge>
        </div>
      </div>

      {/* AI summary */}
      {response.summary && (
        <div className="rounded-control bg-secondary px-4 py-3 text-sm text-card-foreground">
          {response.summary}
        </div>
      )}

      {/* Company fit detail: score, confidence, and the evidence-based
          reasoning inline. Shown once the fit agent has run (or errored). */}
      {(fitScore !== null || fitUnavailable) && (
        <div className="rounded-control border border-border px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-card-foreground">Company fit</span>
            {fitScore !== null && <Badge variant={fitBadgeVariant(fitScore)}>{fitScore}/10</Badge>}
            {fitUnavailable ? (
              <span className="text-xs text-muted-foreground">research unavailable</span>
            ) : (
              fitConfidence && (
                <span className="text-xs text-muted-foreground">
                  confidence: {fitConfidence}
                  {fitLowData ? " · limited data, treat as a rough estimate" : ""}
                </span>
              )
            )}
          </div>
          {fitReasoning && <p className="mt-1.5 text-card-foreground">{fitReasoning}</p>}
        </div>
      )}

      {/* Call script, visually distinct with an accent border */}
      {callScript && (callScript.opener || callScript.talkingPoints.length > 0) && (
        <Card className="border-2 border-primary">
          <CardContent className="flex flex-col gap-4 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold text-card-foreground">Call script</h2>
              <CopyScriptButton text={scriptText} />
            </div>
            {callScript.opener && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Opener
                </span>
                <p className="text-sm text-card-foreground">{callScript.opener}</p>
              </div>
            )}
            {callScript.talkingPoints.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Talking points
                </span>
                <ul className="list-disc pl-5 text-sm text-card-foreground">
                  {callScript.talkingPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pain and signals, side by side */}
      <Card>
        <CardContent className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-card-foreground">Pain</h2>
            {painPoints.length > 0 ? (
              <ul className="list-disc pl-5 text-sm text-card-foreground">
                {painPoints.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">None extracted.</p>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-card-foreground">Signals</h2>
            {signals.length > 0 ? (
              signals.map((signal) => (
                <div key={signal.label} className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {signal.label}
                  </span>
                  <p className="text-sm text-card-foreground">{signal.value}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">None surfaced.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Full transcript, collapsed by default */}
      <details className="rounded-card border border-border bg-card p-4">
        <summary className="cursor-pointer text-sm font-medium text-card-foreground">
          Full transcript ({messages.length} messages)
        </summary>
        <div className="mt-3 flex flex-col gap-2">
          {messages.map((m, i) => (
            <div key={i} className="text-sm text-card-foreground">
              <span className="font-medium">
                {m.role === "assistant" ? "Interviewer: " : "Respondent: "}
              </span>
              {m.content}
            </div>
          ))}
        </div>
      </details>

      {/* Status control */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <span className="text-sm font-medium text-card-foreground">Status</span>
          <StatusControl responseId={response.id} initialStatus={status} />
        </CardContent>
      </Card>

      {/* CRM sync placeholder, no real integration yet */}
      <div className="flex items-center gap-3">
        <Button type="button" disabled>
          Push to HubSpot
        </Button>
        <span className="text-xs text-muted-foreground">Not synced yet.</span>
      </div>
    </div>
  );
}
