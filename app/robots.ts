import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/reports/site";

/**
 * The library is the point of indexing this domain, so /reports is allowed
 * explicitly rather than relying on the bare Allow: /.
 *
 * The disallows are the surfaces that would be actively harmful to index:
 * /admin is the authenticated app, /survey/* is a respondent's live
 * interview, and /api returns JSON. None of them would rank for anything,
 * and a respondent interview appearing in a search result would be a real
 * privacy problem.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/reports"],
        disallow: ["/admin", "/api/", "/survey/"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
