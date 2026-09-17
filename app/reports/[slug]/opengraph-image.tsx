import { ImageResponse } from "next/og";
import { getPublicReport } from "@/lib/reports/public";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Birdsong research report";

/**
 * The social card. This is what renders in Slack and LinkedIn, so it is
 * built to survive being seen at thumbnail size in a scrolling feed: the
 * headline stat is the largest thing on it, the title sits under it, and
 * everything else is small.
 *
 * No custom font is fetched. ImageResponse falls back to its bundled sans
 * face, and Bricolage Grotesque would need a network round trip to a font
 * file on every render of every card. A missing font in an OG image fails
 * as blank rectangles in a feed nobody can debug from, so the tradeoff is
 * a face that always renders over a face that matches the site exactly.
 *
 * Text is clamped by character count rather than by CSS line-clamp, which
 * ImageResponse's layout engine (Satori) does not implement.
 */

function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}...`;
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const report = await getPublicReport(slug);

  // Never throw here: a card that fails to render leaves an empty preview in
  // every feed. An unknown or unpublished slug gets the plain library card.
  const title = report ? clamp(report.title, 110) : "Birdsong Research";
  const stat = report?.headline ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#faf8f1",
          padding: "72px 76px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              backgroundColor: "#3a6046",
              display: "flex",
            }}
          />
          <div style={{ fontSize: 28, fontWeight: 700, color: "#221e18", letterSpacing: "-0.02em" }}>
            Birdsong Research
          </div>
        </div>

        {/* The stat leads. Set on its own line at a size that stays legible
            in a 300px-wide feed thumbnail. */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {stat && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginBottom: 22 }}>
              <div
                style={{
                  fontSize: 96,
                  fontWeight: 800,
                  color: "#3a6046",
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                }}
              >
                {stat.figure}
              </div>
              <div style={{ fontSize: 30, color: "#6c6455", maxWidth: 620, lineHeight: 1.25 }}>
                {clamp(stat.label, 68)}
              </div>
            </div>
          )}
          <div
            style={{
              fontSize: stat ? 40 : 60,
              fontWeight: 700,
              color: "#221e18",
              letterSpacing: "-0.025em",
              lineHeight: 1.16,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
        </div>

        {/* Footer row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 24,
            color: "#786e5e",
            borderTop: "2px solid #e7e1d1",
            paddingTop: 26,
          }}
        >
          {report && (
            <div style={{ display: "flex" }}>
              {report.respondentCount} in-depth interviews
              {report.sponsor ? ` · ${clamp(report.sponsor, 40)}` : ""}
            </div>
          )}
          <div style={{ display: "flex", marginLeft: "auto" }}>usebirdsong.com</div>
        </div>
      </div>
    ),
    size
  );
}
