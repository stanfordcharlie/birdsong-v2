import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Custom max-width breakpoints for the marketing landing pages. None
      // of the three cutoffs land on a default Tailwind screen, and all are
      // max-width, not min-width, variants: lp-stack is the 1080px cutoff
      // the design handoff's own stylesheet uses to collapse every two-column
      // grid (hero, sequence, proof, FAQ, footer) to one column; lp-nav and
      // lp-mobile are the finer nav/layout cutoffs from the mobile handoff.
      // Under `extend`, Tailwind merges these with the default sm/md/lg/xl/2xl
      // (already used elsewhere, e.g. the admin app) rather than replacing them.
      screens: {
        "lp-stack": { max: "1080px" },
        "lp-nav": { max: "920px" },
        "lp-mobile": { max: "760px" },
      },
      colors: {
        // Legacy tokens, left as-is — see app/globals.css for why.
        background: "var(--background)",
        foreground: "var(--foreground)",

        // Birdsong design system tokens (DESIGN.md). Not yet used by any
        // existing page.
        page: "hsl(var(--ds-page-background) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--ds-card) / <alpha-value>)",
          foreground: "hsl(var(--ds-card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--ds-popover) / <alpha-value>)",
          foreground: "hsl(var(--ds-popover-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--ds-primary) / <alpha-value>)",
          hover: "hsl(var(--ds-primary-hover) / <alpha-value>)",
          foreground: "hsl(var(--ds-primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--ds-secondary) / <alpha-value>)",
          foreground: "hsl(var(--ds-secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--ds-muted) / <alpha-value>)",
          foreground: "hsl(var(--ds-muted-foreground) / <alpha-value>)",
        },
        faint: "hsl(var(--ds-faint) / <alpha-value>)",
        accent: {
          DEFAULT: "hsl(var(--ds-accent) / <alpha-value>)",
          foreground: "hsl(var(--ds-accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--ds-destructive) / <alpha-value>)",
          foreground: "hsl(var(--ds-destructive-foreground) / <alpha-value>)",
        },
        success: {
          DEFAULT: "hsl(var(--ds-success) / <alpha-value>)",
          foreground: "hsl(var(--ds-success-foreground) / <alpha-value>)",
          bg: "hsl(var(--ds-success-bg) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--ds-warning) / <alpha-value>)",
          foreground: "hsl(var(--ds-warning-foreground) / <alpha-value>)",
        },
        border: "hsl(var(--ds-border) / <alpha-value>)",
        input: "hsl(var(--ds-input) / <alpha-value>)",
        ring: "hsl(var(--ds-ring) / <alpha-value>)",
        chip: "hsl(var(--ds-chip) / <alpha-value>)",

        // Admin design system, unified pass (app/globals.css). `accent` above
        // is a legacy alias for the neutral grey chip fill and is NOT this —
        // these three are the real accent, formalised from the green that was
        // already in use across admin without ever being a token.
        brand: {
          DEFAULT: "hsl(var(--ds-accent) / <alpha-value>)",
          weak: "hsl(var(--ds-accent-weak) / <alpha-value>)",
          text: "hsl(var(--ds-accent-text) / <alpha-value>)",
          live: "hsl(var(--ds-accent-live) / <alpha-value>)",
        },
        cover: {
          1: "hsl(var(--ds-cover-1) / <alpha-value>)",
          2: "hsl(var(--ds-cover-2) / <alpha-value>)",
          3: "hsl(var(--ds-cover-3) / <alpha-value>)",
        },
        focus: "hsl(var(--ds-focus) / <alpha-value>)",

        // Respondent survey theme (app/globals.css `.survey-theme`). Only the
        // survey route sets that class, so these resolve to nothing anywhere
        // else and cannot leak into admin or marketing.
        survey: {
          ground: "hsl(var(--sv-ground) / <alpha-value>)",
          surface: "hsl(var(--sv-surface) / <alpha-value>)",
          raised: "hsl(var(--sv-raised) / <alpha-value>)",
          ink: "hsl(var(--sv-ink) / <alpha-value>)",
          muted: "hsl(var(--sv-muted) / <alpha-value>)",
          faint: "hsl(var(--sv-faint) / <alpha-value>)",
          border: "hsl(var(--sv-border) / <alpha-value>)",
          accent: "hsl(var(--sv-accent) / <alpha-value>)",
          "accent-bg": "hsl(var(--sv-accent-bg) / <alpha-value>)",
          danger: "hsl(var(--sv-danger) / <alpha-value>)",
          info: "hsl(var(--sv-info) / <alpha-value>)",
          "info-bg": "hsl(var(--sv-info-bg) / <alpha-value>)",
          butter: "hsl(var(--sv-butter) / <alpha-value>)",
        },
        indigo: {
          DEFAULT: "hsl(var(--ds-indigo) / <alpha-value>)",
          light: "hsl(var(--ds-indigo-light) / <alpha-value>)",
          chip: "hsl(var(--ds-indigo-chip) / <alpha-value>)",
        },
        sidebar: {
          DEFAULT: "hsl(var(--ds-sidebar) / <alpha-value>)",
          foreground: "hsl(var(--ds-sidebar-foreground) / <alpha-value>)",
          "active-foreground": "hsl(var(--ds-sidebar-active-foreground) / <alpha-value>)",
          accent: "hsl(var(--ds-sidebar-accent) / <alpha-value>)",
          border: "hsl(var(--ds-sidebar-border) / <alpha-value>)",
          ring: "hsl(var(--ds-sidebar-ring) / <alpha-value>)",
          plate: "hsl(var(--ds-sidebar-plate) / <alpha-value>)",
          label: "hsl(var(--ds-sidebar-label) / <alpha-value>)",
          muted: "hsl(var(--ds-sidebar-muted) / <alpha-value>)",
        },

        // Marketing landing pages (design_handoff_landing_pages_full) — a
        // separate token system from --ds-* above (marketing is explicitly
        // out of scope for the platform design system, see DESIGN.md).
        // Plain hex custom properties, not the HSL-triplet/<alpha-value>
        // convention: nothing here needs an alpha-modified variant. bg /
        // surface / border read from --lp-* vars that swap between the
        // "cream" default and a "eggshell" override (see globals.css) —
        // the same tone-switch the design handoff itself implements, now
        // driven by a data-tone attribute on LandingPageShell instead of a
        // prototype prop.
        landing: {
          bg: "var(--lp-bg)",
          surface: "var(--lp-surface)",
          sunk: "var(--lp-sunk)",
          ink: {
            DEFAULT: "var(--lp-ink)",
            soft: "var(--lp-ink-soft)",
          },
          muted: "var(--lp-muted)",
          faint: "var(--lp-faint)",
          border: "var(--lp-border)",
          hair: "var(--lp-hair)",
          green: {
            DEFAULT: "var(--lp-green)",
            deep: "var(--lp-green-deep)",
            bg: "var(--lp-green-bg)",
            line: "var(--lp-green-line)",
          },
          blue: {
            DEFAULT: "var(--lp-blue)",
            bg: "var(--lp-blue-bg)",
          },
          butter: {
            deep: "var(--lp-butter-deep)",
            bg: "var(--lp-butter-bg)",
          },
        },
      },
      borderRadius: {
        card: "var(--ds-radius-card)",
        control: "var(--ds-radius-control)",
        pill: "var(--ds-radius-pill)",
      },
      boxShadow: {
        // The one admin card elevation. No page defines its own.
        card: "var(--ds-shadow-card)",
        "card-hover": "var(--ds-shadow-card-hover)",
      },
      maxWidth: {
        container: "var(--ds-container-max)",
      },
      fontSize: {
        // Named steps for the admin controls, so a primitive never writes a
        // raw px font size. The prose scale lives in globals.css as .type-*
        // roles; these are the sizes those roles cannot express, because a
        // control needs a size without also inheriting a colour and leading.
        micro: ["11.5px", { lineHeight: "1.2" }],
        count: ["12px", { lineHeight: "1.2" }],
        control: ["13px", { lineHeight: "1.2" }],
        "display-sm": ["28px", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        // Sidebar-only: the wordmark and the nav item label.
        wordmark: ["21px", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        nav: ["15px", { lineHeight: "1.2", letterSpacing: "-0.005em" }],
      },
      fontFamily: {
        // Global body default. Marketing pages (out of scope for the
        // platform redesign) still render in Inter via this — the admin +
        // respondent surfaces override it explicitly with font-archivo at
        // their layout root instead of redefining the shared default.
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        newsreader: ["var(--font-newsreader)", "Georgia", "serif"],
        // Platform design system (see design_handoff_birdsong_platform):
        // Archivo for UI text, Young Serif for display headings/big
        // numbers/wordmark only.
        archivo: ["var(--font-archivo)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-young-serif)", "Georgia", "serif"],
        // Survey respondent flow (normal style) and, italic only, the
        // marketing landing pages' pull quotes.
        spectral: ["var(--font-spectral)", "Georgia", "serif"],
        // Marketing landing pages only (design_handoff_landing_v2) —
        // Bricolage Grotesque for display/headings at weight 700, DM Sans for
        // body and UI. Applied at LandingPageShell, which is why neither
        // touches the global `sans` default above.
        bricolage: [
          "var(--font-bricolage)",
          "var(--font-dm-sans)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        dmsans: ["var(--font-dm-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
