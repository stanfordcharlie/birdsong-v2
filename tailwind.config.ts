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
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
