/**
 * The single source of truth for every chart drawn from a report.
 *
 * Nothing here knows about SVG, React, or PDF. It turns a
 * SurveyReportContent into plain, already-computed chart series: values,
 * labels, percentages, axis maximum, and the ordering. Any renderer — the
 * web charts in components/research, an OG image, and the PDF when it is
 * built — consumes these functions rather than reaching into report content
 * itself.
 *
 * That is the whole point. A chart is a claim about the data, and two
 * renderers that each do their own counting will eventually disagree about
 * what the study found. Rounding, sort order, and the denominator are
 * decided once, here.
 *
 * There is deliberately no `chart_data` column. The report content already
 * carries the only quantitative series the model produces
 * (pain_point_frequency); persisting a second, derived copy of it would
 * create exactly the drift this module exists to prevent.
 */

import type { SurveyReportContent } from "@/lib/report/generate";

export type ChartBar = {
  /** The pain point, verbatim from the report. */
  label: string;
  /** Distinct respondents who raised it. */
  value: number;
  /** Share of all respondents in the study, 0-100, rounded to whole. */
  percent: number;
  /** Bar length as a share of the axis maximum, 0-1. Renderers scale by this. */
  ratio: number;
};

export type BarChartData = {
  bars: ChartBar[];
  /** Respondents in the study — the denominator behind every percent. */
  total: number;
  /** Largest value present. Bars are drawn against this, not against total. */
  max: number;
  /** Ready-to-render caption stating the denominator. */
  caption: string;
};

/**
 * Pain-point frequency as a horizontal bar chart.
 *
 * Bars scale against the largest value rather than the respondent count.
 * Against the total, a study where the top pain point is raised by 6 of 16
 * draws every bar in the left third of the frame and reads as "nothing much
 * happened here", which is a misreading of a real finding. The caption
 * carries the denominator so the scale is never ambiguous.
 *
 * Sorted by count descending. Ties keep the model's own ordering, which
 * follows the order the themes were developed in.
 */
export function painPointChart(
  content: SurveyReportContent,
  respondentCount: number,
  { limit = 8 }: { limit?: number } = {}
): BarChartData | null {
  const raw = (content.pain_point_frequency ?? []).filter(
    (p) => p && typeof p.respondent_count === "number" && p.respondent_count > 0 && p.pain_point
  );
  if (raw.length === 0) return null;

  const sorted = [...raw]
    .sort((a, b) => b.respondent_count - a.respondent_count)
    .slice(0, limit);

  const max = Math.max(...sorted.map((p) => p.respondent_count));
  // A report can outlive an edit to its study's response set, so the stored
  // respondent_count is not guaranteed to be >= every bar. Clamp the
  // denominator up so a percentage can never exceed 100.
  const total = Math.max(respondentCount, max);

  return {
    total,
    max,
    caption: `Distinct respondents raising each issue, of ${total} interviewed.`,
    bars: sorted.map((p) => ({
      label: p.pain_point,
      value: p.respondent_count,
      percent: Math.round((p.respondent_count / total) * 100),
      ratio: p.respondent_count / max,
    })),
  };
}

/**
 * The one number a reader should leave with, and the number the OG card
 * leads on.
 *
 * Chosen as the most-cited pain point rather than anything derived across
 * themes: it is the only figure in the report that is literally counted from
 * the transcripts, so it is the only one that survives being pulled out of
 * context and put on a social card.
 */
export type HeadlineStat = {
  /** e.g. "13 of 16" */
  figure: string;
  /** e.g. "81%" */
  percent: string;
  /** What the figure counts, as a sentence fragment. */
  label: string;
};

export function headlineStat(
  content: SurveyReportContent,
  respondentCount: number
): HeadlineStat | null {
  const chart = painPointChart(content, respondentCount, { limit: 1 });
  if (!chart) return null;
  const top = chart.bars[0];
  return {
    figure: `${top.value} of ${chart.total}`,
    percent: `${top.percent}%`,
    label: top.label,
  };
}

/**
 * Every section that gets an anchor and a table-of-contents entry.
 *
 * Built here rather than in the page so the table of contents, the heading
 * ids, and the OG/JSON-LD section list cannot fall out of step: they all
 * enumerate this.
 */
export type ReportSection = {
  id: string;
  /** Contents-rail label, e.g. "Key findings". */
  label: string;
  /** The mono kicker over the section's heading, e.g. "KEY FINDINGS". */
  kicker: string;
  /** Two-digit section number, "01". */
  number: string;
};

export function reportSections(content: SurveyReportContent): ReportSection[] {
  const raw: { id: string; label: string; kicker: string; present: boolean }[] = [
    { id: "summary", label: "Executive summary", kicker: "Executive summary", present: true },
    {
      id: "key-findings",
      label: "Key findings",
      kicker: "Key findings",
      present: (content.takeaways ?? []).length > 0,
    },
    {
      id: "frequency",
      label: "Issue frequency",
      kicker: "What came up most",
      present: (content.pain_point_frequency ?? []).length > 0,
    },
    {
      id: "themes",
      label: "Themes in detail",
      kicker: "Themes in detail",
      present: (content.key_themes ?? []).length > 0,
    },
    {
      id: "in-their-words",
      label: "In their words",
      kicker: "In their words",
      present: (content.notable_quotes ?? []).length > 0,
    },
    { id: "methodology", label: "Methodology", kicker: "Methodology", present: true },
  ];
  return raw
    .filter((section) => section.present)
    .map((section, i) => ({
      id: section.id,
      label: section.label,
      kicker: section.kicker,
      number: String(i + 1).padStart(2, "0"),
    }));
}

/** The section entry for an id, for a heading that needs its own number. */
export function reportSection(sections: ReportSection[], id: string): ReportSection | undefined {
  return sections.find((section) => section.id === id);
}

/**
 * The KPI row under the hero.
 *
 * A handful of headline numbers is a stat row, not a chart: there is no
 * shared scale between "16 interviews" and "4 themes", so plotting them
 * together as bars would invent a comparison that does not exist.
 *
 * Every figure is counted from the report, never estimated.
 */
export type ReportStat = {
  figure: string;
  /** A lighter trailing unit or denominator, e.g. "/16". */
  suffix?: string;
  label: string;
};

export function reportStats(
  content: SurveyReportContent,
  respondentCount: number
): ReportStat[] {
  const chart = painPointChart(content, respondentCount, { limit: 100 });
  const stats: ReportStat[] = [];
  if (chart) {
    const top = chart.bars[0];
    stats.push({
      figure: String(top.value),
      suffix: `/${chart.total}`,
      label: `raised ${lowerFirst(stripTrailingPeriod(top.label))}`,
    });
    stats.push({ figure: String(chart.bars.length), label: "distinct issues coded across the interview set" });
  }
  if (content.key_themes?.length) {
    stats.push({ figure: String(content.key_themes.length), label: "themes with supporting evidence" });
  }
  stats.push({ figure: String(respondentCount), label: "in-depth interviews behind every count" });
  return stats.slice(0, 4);
}

/**
 * One dot per respondent, for the unit chart.
 *
 * Returned as a flat array of booleans rather than a count so the renderer
 * cannot disagree with the adapter about how many dots to draw or how many
 * to fill.
 */
export function respondentDots(bar: ChartBar, total: number): boolean[] {
  return Array.from({ length: total }, (_, i) => i < bar.value);
}

/**
 * The dek: the standfirst under the title.
 *
 * The report schema has no dek field, so this is the executive summary's
 * opening sentence, which the prompt already constrains to be the single
 * most important finding. Cut on sentence boundaries only — a dek trimmed
 * mid-clause reads as broken rather than as brief — and fall back to the
 * whole summary if the first sentence is unusably short.
 */
export function reportDek(content: SurveyReportContent, maxChars = 240): string {
  const summary = (content.executive_summary ?? "").trim();
  if (!summary) return "";
  if (summary.length <= maxChars) return summary;

  const sentences = summary.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [];
  let out = "";
  for (const sentence of sentences) {
    if ((out + sentence).trim().length > maxChars) break;
    out += sentence;
  }
  out = out.trim();
  if (out.length >= 60) return out;

  // No whole sentence fits (these summaries open with one long sentence
  // more often than not). Fall back to a word boundary rather than a raw
  // slice, which otherwise cuts mid-word and reads as a rendering fault.
  const cut = summary.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()}...`;
}

/**
 * The methodology line shown under the hero and used as the JSON-LD
 * description.
 *
 * meta.interviews_included can be lower than the study's completed count
 * when the transcript budget forced trimming (see lib/report/generate.ts).
 * The published line states what actually fed the analysis, because that is
 * the honest denominator, and notes the trim rather than hiding it.
 */
export function methodologyLine(
  content: SurveyReportContent,
  respondentCount: number,
  topic?: string | null
): string {
  const included = content.meta?.interviews_included ?? respondentCount;
  const total = content.meta?.interviews_total ?? respondentCount;

  const count = `${included} in-depth interview${included === 1 ? "" : "s"}`;
  const scope = topic?.trim() ? ` on ${lowerFirst(stripTrailingPeriod(topic.trim()))}` : "";
  const trimmed =
    total > included ? ` Drawn from ${total} completed interviews in the study.` : "";

  return `Based on ${count}${scope}.${trimmed}`;
}

function stripTrailingPeriod(s: string): string {
  return s.replace(/\.+$/, "");
}

function lowerFirst(s: string): string {
  // Only lowercase a plain capitalized word, never an acronym (CRM, HVAC)
  // or a proper noun already mid-phrase.
  if (/^[A-Z][A-Z]/.test(s)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}
