import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
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
          ink: "var(--lp-ink)",
          muted: "var(--lp-muted)",
          faint: "var(--lp-faint)",
          border: "var(--lp-border)",
          green: {
            DEFAULT: "var(--lp-green)",
            bg: "var(--lp-green-bg)",
          },
          blue: {
            DEFAULT: "var(--lp-blue)",
            mid: "var(--lp-blue-mid)",
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
        // Marketing landing pages only (design_handoff_landing_pages_full)
        // — headings, weight 700.
        bricolage: ["var(--font-bricolage)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
