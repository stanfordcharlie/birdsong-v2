import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { userFirstName } from "@/lib/user-name";
import { cn } from "@/lib/utils";
import { GreetingBlock } from "./GreetingBlock";
import { GreetingMascot } from "./GreetingMascot";
import { CopySurveyLinkButton } from "./CopySurveyLinkButton";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

// A lead counts as qualified from 7 up — the same threshold the score badge
// switches to its "warning" (warm) band at, so the stat and the badges below
// it agree about what a good score looks like.
const QUALIFIED_SCORE_MIN = 7;

// Same bands as the Leads queue's score badge (LeadsQueue.scoreBadgeVariant),
// reused here so a score reads the same way everywhere it appears.
function scoreBadgeVariant(score: number | null): BadgeVariant {
  if (score === null) return "outline";
  if (score >= 9) return "success";
  if (score >= QUALIFIED_SCORE_MIN) return "warning";
  if (score >= 5) return "default";
  return "outline";
}

function StatCard({ href, value, label }: { href: string; value: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-card border border-border bg-card p-6 transition-colors hover:bg-card-foreground/[0.04]"
    >
      <div className="text-[26px] font-semibold leading-none tracking-[-0.01em] text-card-foreground">
        {value}
      </div>
      <div className="mt-2 text-[13px] text-muted-foreground">{label}</div>
    </Link>
  );
}

// The two list cards share a shell: a titled surface card whose rows run
// edge to edge, so row hover fills the card's full width rather than
// floating inside its padding.
function ListCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-card border border-border bg-card">
      <div className="flex items-center justify-between gap-4 px-6 pb-4 pt-6">
        <h2 className="type-heading">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// `pb` is dropped by the surveys card, whose trailing "New survey" link
// supplies the card's bottom padding itself.
function EmptyRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("px-6 pb-6 text-[13px] text-faint", className)}>{children}</p>;
}

export default async function AdminHomePage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return null;

  // Three parallel queries, no waterfall: profile for the greeting name,
  // every survey this admin owns (small — status/count logic runs in JS),
  // and every completed, non-test response (excluded at the query level so
  // every downstream count/stat/list is clean by construction).
  const [{ data: profile }, { data: surveysData }, { data: responsesData }] = await Promise.all([
    supabase.from("profiles").select("contact_name").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("surveys")
      .select("id, slug, title, status, created_at")
      .eq("user_id", user.id)
      // Archived surveys are excluded from every stat and list on this page,
      // the same way they're excluded from the surveys list's default view.
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("responses")
      .select("id, survey_id, respondent_name, lead_score, created_at")
      .eq("user_id", user.id)
      .eq("completed", true)
      .eq("is_test", false)
      .order("created_at", { ascending: false }),
  ]);

  const firstName = userFirstName(user, profile?.contact_name);
  const surveys = surveysData ?? [];
  const surveyIds = new Set(surveys.map((s) => s.id));
  // A response whose survey has since been archived still exists, but this
  // page has already dropped that survey — so drop its responses too, and
  // every stat, count, and list stays consistent with what's on screen.
  const responses = (responsesData ?? []).filter((r) => surveyIds.has(r.survey_id));

  const surveyTitleById = new Map(surveys.map((s) => [s.id, s.title]));
  const liveSurveyCount = surveys.filter((s) => s.status === "live").length;
  const qualifiedCount = responses.filter((r) => (r.lead_score ?? 0) >= QUALIFIED_SCORE_MIN).length;

  const responseCountBySurvey = new Map<string, number>();
  for (const r of responses) {
    responseCountBySurvey.set(r.survey_id, (responseCountBySurvey.get(r.survey_id) ?? 0) + 1);
  }

  const recentResponses = responses.slice(0, 5);

  return (
    <div className="admin-container flex flex-col gap-6">
      {/* GreetingBlock carries its own bs-rise-1; the mascot gets the same
          class so the two arrive together rather than nesting a second
          animation around a block that already has one. */}
      <div className="flex items-end justify-between gap-6">
        <GreetingBlock firstName={firstName} />
        <div className="bs-rise-1">
          <GreetingMascot />
        </div>
      </div>

      <section className="bs-rise-2 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <StatCard href="/admin/leads" value={responses.length} label="Total responses" />
        <StatCard href="/admin/leads" value={qualifiedCount} label="Qualified leads" />
        <StatCard href="/admin/surveys?status=live" value={liveSurveyCount} label="Live surveys" />
      </section>

      {/* Recent responses takes the wider column; the survey list is a
          narrower companion. Below lg both stack to full width. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="bs-rise-3">
          <ListCard
            title="Recent responses"
            action={
              recentResponses.length > 0 ? (
                <Link
                  href="/admin/leads"
                  className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-card-foreground"
                >
                  View all
                </Link>
              ) : undefined
            }
          >
            {recentResponses.length === 0 ? (
              <EmptyRow>
                Once someone completes an interview, their score and details will show up here.
              </EmptyRow>
            ) : (
              <div className="flex flex-col pb-2">
                {recentResponses.map((r) => (
                  <Link
                    key={r.id}
                    href={`/admin/responses/${r.id}`}
                    className="flex items-center gap-4 border-t border-border px-6 py-4 transition-colors hover:bg-secondary"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-medium text-card-foreground">
                        {r.respondent_name || "Anonymous"}
                      </div>
                      <div className="mt-1 truncate text-sm text-muted-foreground">
                        {surveyTitleById.get(r.survey_id) ?? "—"}
                      </div>
                    </div>
                    <Badge variant={scoreBadgeVariant(r.lead_score)}>{r.lead_score ?? "—"}</Badge>
                    <span className="w-[70px] shrink-0 text-right type-meta" suppressHydrationWarning>
                      {formatRelativeTime(r.created_at)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </ListCard>
        </div>

        <div className="bs-rise-4">
          <ListCard title="Your surveys">
            {surveys.length === 0 ? (
              <EmptyRow className="pb-0">
                No surveys yet. Create one and Wren starts interviewing the moment you share the
                link.
              </EmptyRow>
            ) : (
              <div className="flex flex-col">
                {surveys.map((survey) => {
                  const isLive = survey.status === "live";
                  return (
                    // relative + a stretched link inside: the whole row
                    // navigates, while the copy button lifts above it with
                    // relative z-10 so it stays independently clickable —
                    // the same escape hatch the surveys table row uses.
                    <div
                      key={survey.id}
                      className="relative flex items-center gap-3 border-t border-border px-6 py-4 transition-colors hover:bg-secondary"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/surveys/${survey.id}`}
                          className="text-[15px] font-medium text-card-foreground"
                        >
                          <span className="absolute inset-0" />
                          <span className="block truncate">{survey.title}</span>
                        </Link>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Badge variant={isLive ? "success" : "warning"}>
                            {isLive ? "Live" : "Draft"}
                          </Badge>
                          <span className="type-meta">
                            {responseCountBySurvey.get(survey.id) ?? 0} response
                            {(responseCountBySurvey.get(survey.id) ?? 0) === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                      {isLive && (
                        <div className="relative z-10 shrink-0">
                          <CopySurveyLinkButton slug={survey.slug} title={survey.title} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className={cn("px-6 pb-6 pt-4", surveys.length > 0 && "border-t border-border")}>
              <Link
                href="/admin/surveys/new"
                className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-card-foreground"
              >
                New survey
              </Link>
            </div>
          </ListCard>
        </div>
      </div>
    </div>
  );
}
