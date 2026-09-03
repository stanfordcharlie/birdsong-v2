import type { MetadataRoute } from "next";
import { listPublicReports } from "@/lib/reports/public";
import { siteUrl } from "@/lib/reports/site";

// Regenerated on the same cadence as the library itself, so a study that is
// un-published drops out without a redeploy.
export const revalidate = 3600;

/**
 * Only public pages. listPublicReports() is gated by the
 * survey_reports_public_read policy, so a report that is published to its
 * customer but not publish_public is not merely omitted here, it is not
 * readable by the credentials this build uses.
 *
 * /admin and /survey are absent deliberately: one is authenticated, the
 * other is a per-respondent flow that should never be indexed. robots.ts
 * disallows both.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const reports = await listPublicReports();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/reports`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/customer-success`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  return [
    ...staticRoutes,
    ...reports.map((report) => ({
      url: `${base}/reports/${report.slug}`,
      lastModified: new Date(report.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
