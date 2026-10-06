import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Courier_Prime } from "next/font/google";
import styles from "./page.module.css";

// Scoped to this page, deliberately not added to lib/fonts.ts: the letter is
// the only surface in the app set in a typewriter face, and lib/fonts.ts is
// shared with admin, the respondent study and the landing pages.
//
// 400 and 700, normal and italic: the four faces the reference stylesheet
// links. next/font has no way to ask for only three of the four.
const courierPrime = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

// The homepage is the primary indexed page for the domain, so these two
// strings (not the generic fallback in app/layout.tsx) are what search and
// social previews show for usebirdsong.com.
const TITLE = "Birdsong";
const DESCRIPTION = "A letter from Charlie, who built Birdsong.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "Birdsong",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
};

// The one live Birdsong-run study, and the published report from the study
// before it. Both are real pages on this domain rather than placeholders.
// The letter offers to show the reader an interview and a report, so each
// link has to actually be one; the design reference shipped with a slug
// placeholder and a bare "#" in these two spots.
//
// The interview link is the only Birdsong-sponsored study that is live and
// unarchived. If it is ever closed, this link renders the "no longer
// accepting responses" screen and wants repointing.
const SAMPLE_INTERVIEW_URL =
  "https://www.usebirdsong.com/study/how-sales-teams-build-and-manage-pipeline-today-nv1e0s";
const SAMPLE_REPORT_URL =
  "/reports/how-revops-teams-handle-lead-routing-and-crm-hygiene-0wtui4";

// Rows of the "short version" box. Two columns that wrap to one under the
// label's 140px basis.
const SHORT_VERSION: ReadonlyArray<[label: string, value: string]> = [
  ["What it is", "Interviews that find buyers with a real problem"],
  [
    "What you get",
    "More pipeline, more inbound leads (scored, with call notes), and reports on your market",
  ],
];

const MUTED = { color: "#555555", fontSize: 15 } as const;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  // Supabase should send email-confirmation clicks straight to
  // /api/auth/callback (via the signup call's emailRedirectTo), but if its
  // Site URL config forces the redirect back to the site root instead, the
  // ?code= lands here still unexchanged. Forward it to the callback route so
  // the session actually gets created rather than stranding the user, logged
  // out, on the letter with a raw code in the URL.
  //
  // This is the whole reason the page is async rather than fully static: it
  // carried over from the landing page that used to render at `/`, and
  // dropping it with the move would have quietly broken confirmation links.
  // The landing page's other root behaviour, bouncing a signed-in visitor to
  // /admin, did not carry over. The letter is meant to be readable by anyone
  // who types the domain, signed in or not.
  const { code } = await searchParams;
  if (code) {
    redirect(`/api/auth/callback?code=${encodeURIComponent(code)}&next=/admin`);
  }

  return (
    <div
      className={`${styles.root} ${courierPrime.className}`}
      style={{ fontFamily: `${courierPrime.style.fontFamily}, 'Courier New', monospace` }}
    >
      <div
        style={{
          maxWidth: 620,
          width: "100%",
          margin: "0 auto 48px",
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <Image
            src="/charlie.jpg"
            alt="Charlie"
            width={96}
            height={96}
            priority
            style={{ objectFit: "cover", display: "block" }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: 700 }}>Birdsong</span>
            <span style={MUTED}>usebirdsong.com · San Francisco</span>
          </div>
        </div>

        <span style={MUTED}>October 2026</span>

        <p style={{ margin: 0 }}>Hi,</p>

        <p style={{ margin: 0 }}>
          I&#39;m{" "}
          <a
            href="https://www.linkedin.com/in/charlie-cohen/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Charlie
          </a>
          . I started
          my career as an SDR, and nothing made my day like an inbound lead. No ninth
          follow-up, no &#8220;take me off your list.&#8221;
        </p>

        <p style={{ margin: 0 }}>
          <a href="https://learn.g2.com/lead-generation-statistics">G2</a> says inbound leads
          close at 14.6%, versus 1.7% for outbound.
        </p>

        <p style={{ margin: 0 }}>
          You can&#39;t make people raise their hand, so I built Birdsong. It uses AI to
          interview people in your market, like a researcher would.{" "}
          <b>
            When someone mentions a problem you solve, they go straight to your reps with
            notes on what they said.
          </b>{" "}
          Every answer goes into a report you can publish.
        </p>

        <p style={{ margin: 0 }}>
          The AI does the digging, so your reps get calls that start from something real.
        </p>

        <p style={{ margin: 0 }}>
          Curious? See what an interview looks like <a href={SAMPLE_INTERVIEW_URL}>here</a>.
        </p>

        <p style={{ margin: 0 }}>
          Charlie
          <br />
          <a href="mailto:charlie@usebirdsong.com">charlie@usebirdsong.com</a>
        </p>

        <div
          style={{
            border: "1px solid #1c1c1c",
            padding: 22,
            marginTop: 16,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            fontSize: 16,
          }}
        >
          <span style={{ fontWeight: 700 }}>The short version</span>
          {SHORT_VERSION.map(([label, value]) => (
            <div key={label} style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
              <span style={{ flex: "0 0 140px", color: "#555555" }}>{label}</span>
              <span style={{ flex: "1 1 260px" }}>{value}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20 }}>
          <a
            href="/product"
            style={{
              background: "#3a6046",
              color: "#ffffff",
              textDecoration: "none",
              padding: "14px 24px",
              borderRadius: 4,
              fontWeight: 700,
            }}
          >
            Check out the product
          </a>
          <a href={SAMPLE_REPORT_URL}>See a sample report</a>
        </div>
      </div>
    </div>
  );
}
