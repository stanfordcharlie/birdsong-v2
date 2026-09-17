/**
 * Reads for the public research library.
 *
 * Every query here goes through the ordinary anon client, never
 * createAdminClient(). The survey_reports_public_read policy (see
 * 20260902000000_public_research_library.sql) is what enforces "published
 * AND publish_public", so an unpublished report is not merely filtered out
 * of these functions, it is unreadable by the credentials these pages hold.
 * The explicit .eq/.filter calls below are a second lock on the same door,
 * not the only one.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { SurveyReportContent } from "@/lib/report/generate";
import { reportDek, methodologyLine, headlineStat, type HeadlineStat } from "./chart-data";

export type PublicReport = {
  /** The study's slug. The library is keyed on this: one report per study. */
  slug: string;
  title: string;
  dek: string;
  methodology: string;
  sponsor: string | null;
  topic: string | null;
  /** Who the study targeted, for the study profile card. Null when unset. */
  companySize: string | null;
  roles: string | null;
  respondentCount: number;
  publishedAt: string;
  content: SurveyReportContent;
  headline: HeadlineStat | null;
};

/**
 * The cache tag every library read is filed under. The publish route
 * revalidates it, which is what makes a publish show up immediately.
 */
export const REPORTS_CACHE_TAG = "public-reports";

/**
 * A plain anon client with no cookie/session wiring.
 *
 * The library is statically generated and identical for every visitor, so
 * binding it to the request's auth cookies (as lib/supabase/server does)
 * would make these pages dynamic for no gain. Using the anon key keeps RLS
 * in force.
 *
 * The tagged fetch is load-bearing, not an optimisation. supabase-js calls
 * global fetch, which Next patches and caches in the Data Cache keyed by
 * request. Untagged, those entries inherit the page's revalidate window and
 * survive across builds in .next/cache — so a study published from the admin
 * toggle kept serving the pre-publish (empty) response for up to an hour,
 * even though revalidatePath had already rebuilt the page around it. That
 * failure was observed, not theorised: the index rendered its empty state
 * while the report page it should have linked to rendered fine.
 *
 * Tagging instead of no-store keeps these pages statically generated;
 * no-store would opt the whole route out of SSG.
 */
function publicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, next: { tags: [REPORTS_CACHE_TAG] } } as RequestInit),
      },
    }
  );
}

// Exact columns, never select("*"): content is large and the surrounding
// survey row carries fields (question_guide, target_industry) that have no
// business leaving the admin surface. The two target_* descriptors below are
// the audience statement a published methodology normally carries.
const REPORT_COLUMNS =
  "content, respondent_count, published_at, created_at, surveys!inner(slug, title, topic, sponsor, publish_public, target_company_size, target_job_title)";

type ReportQueryRow = {
  content: unknown;
  respondent_count: number;
  published_at: string | null;
  created_at: string;
  surveys: {
    slug: string;
    title: string;
    topic: string | null;
    sponsor: string | null;
    publish_public: boolean;
    target_company_size: string | null;
    target_job_title: string | null;
  } | null;
};

function toPublicReport(row: ReportQueryRow): PublicReport | null {
  const survey = row.surveys;
  if (!survey || !survey.publish_public) return null;

  const content = row.content as SurveyReportContent | null;
  // A malformed or half-written content blob should drop the report from the
  // library rather than render an empty page at an indexed URL.
  if (!content?.title || !Array.isArray(content.key_themes)) return null;

  return {
    slug: survey.slug,
    title: content.title,
    dek: reportDek(content),
    methodology: methodologyLine(content, row.respondent_count, survey.topic),
    sponsor: survey.sponsor,
    topic: survey.topic,
    companySize: survey.target_company_size?.trim() || null,
    roles: survey.target_job_title?.trim() || null,
    respondentCount: row.respondent_count,
    // published_at backfills to created_at for any row published before the
    // column existed, so ordering never collapses to null.
    publishedAt: row.published_at ?? row.created_at,
    content,
    headline: headlineStat(content, row.respondent_count),
  };
}

/**
 * Every public report, newest first.
 *
 * A study can have several report rows (regeneration inserts rather than
 * updates), so this keeps only the most recent published row per study —
 * the library shows one report per study, keyed on the study slug.
 */
export async function listPublicReports(): Promise<PublicReport[]> {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("survey_reports")
    .select(REPORT_COLUMNS)
    .eq("published", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[reports/public] list failed:", error.message);
    return [];
  }

  const bySlug = new Map<string, PublicReport>();
  for (const row of (data ?? []) as unknown as ReportQueryRow[]) {
    const report = toPublicReport(row);
    if (report && !bySlug.has(report.slug)) bySlug.set(report.slug, report);
  }
  return Array.from(bySlug.values()).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/** One public report by its study slug, or null. Null must become a 404. */
export async function getPublicReport(slug: string): Promise<PublicReport | null> {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("survey_reports")
    .select(REPORT_COLUMNS)
    .eq("published", true)
    .eq("surveys.slug", slug)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[reports/public] fetch failed:", error.message);
    return null;
  }
  const row = (data ?? [])[0] as unknown as ReportQueryRow | undefined;
  return row ? toPublicReport(row) : null;
}

/** Distinct sponsors across the library, for the index filter. */
export function sponsorsOf(reports: PublicReport[]): string[] {
  return Array.from(
    new Set(reports.map((r) => r.sponsor).filter((s): s is string => Boolean(s)))
  ).sort((a, b) => a.localeCompare(b));
}
