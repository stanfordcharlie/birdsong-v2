import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
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
        },
        warning: {
          DEFAULT: "hsl(var(--ds-warning) / <alpha-value>)",
          foreground: "hsl(var(--ds-warning-foreground) / <alpha-value>)",
        },
        border: "hsl(var(--ds-border) / <alpha-value>)",
        input: "hsl(var(--ds-input) / <alpha-value>)",
        ring: "hsl(var(--ds-ring) / <alpha-value>)",
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
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
