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
        // Home landing page redesign (design_handoff_birdsong_landing). A
        // min-width screen, unlike the three above: it is the width at which
        // HomeNav's four section links actually fit beside the logo and both
        // auth buttons (~1090px measured), so they are revealed here rather
        // than at `lg`, where the row wraps onto a second line.
        "ln-nav": "1100px",
        // The report template's contents rail. Below this the body is one
        // column and the rail is dropped (see ContentsRail) — the handoff's
        // 960px cutoff.
        "ln-rail": "960px",
        // Home landing page v2 (design_handoff_birdsong_landing). The width
        // at which the hero's two note columns and the product section's
        // pinned panel have room; below it the hero is one column, the notes
        // are dropped and the panel stops being sticky.
        //
        // A named screen rather than `min-[900px]:` at the call sites: the
        // object-form screens above (lp-stack, short, …) switch Tailwind's
        // arbitrary min-*/max-* variants off entirely, and those classes then
        // emit nothing at all rather than failing loudly.
        "hp-wide": "900px",
        // Home landing page, sky direction (`/`). The same 900px
        // cutoff as hp-wide above, deliberately duplicated under its own
        // name: it is where the hero's 300px card column has room beside the
        // headline, and where the CTA/section padding steps up. The two
        // surfaces are separate directions on the same route and either may
        // move its breakpoint without dragging the other with it.
        "bsl-wide": "900px",
        // Respondent question screen (app/survey/[slug]): height tiers that
        // compact the column so a short laptop window still fits the whole
        // screen without scrolling. Raw media queries, since Tailwind screens
        // are width-based by default. Listed after the width screens so a
        // `short:sm:` rule is emitted after, and wins over, its `sm:` base.
        short: { raw: "(max-height: 820px)" },
        xshort: { raw: "(max-height: 700px)" },
        // Respondent survey, sky direction (/study/[slug]). The width at which
        // the welcome screen's interviewer card has room beside the headline;
        // below it the card is dropped, the flock is hidden and the stage
        // loses its 72px gutters. A named screen for the reason given under
        // hp-wide above: the object-form screens here switch Tailwind's
        // arbitrary min-*/max-* variants off, so `min-[1100px]:` would emit
        // nothing at all rather than failing loudly.
        "study-wide": "1100px",
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
        // A sunk panel inside a card (Home's transcript preview).
        surface: "hsl(var(--ds-surface) / <alpha-value>)",

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
          avatar: "hsl(var(--ds-sidebar-avatar) / <alpha-value>)",
          "avatar-foreground": "hsl(var(--ds-sidebar-avatar-foreground) / <alpha-value>)",
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

        // Home landing page redesign (design_handoff_birdsong_landing) —
        // /landing-old only. A separate palette from `landing` above, not an
        // extension of it: the root route was redesigned on its own and
        // /customer-success, /reports and the legal pages still render the
        // older one. See the --ln-* block in app/globals.css.
        ln: {
          ink: "var(--ln-ink)",
          body: "var(--ln-body)",
          muted: "var(--ln-muted)",
          faint: "var(--ln-faint)",
          cream: "var(--ln-cream)",
          rule: "var(--ln-rule)",
          "card-border": "var(--ln-card-border)",
          green: {
            DEFAULT: "var(--ln-green)",
            hover: "var(--ln-green-hover)",
            tint: "var(--ln-green-tint)",
            mid: "var(--ln-green-mid)",
            pale: "var(--ln-green-pale)",
          },
          sage: "var(--ln-sage)",
          "logo-cream": "var(--ln-logo-cream)",
        },

        // Home landing page, v2 direction (design_handoff_birdsong_landing,
        // `Birdsong Landing v2.dc.html`) — /landing-old only. Kept apart from `ln`
        // above because those tokens are also what the public research
        // report pages render on. See the --hp-* block in app/globals.css.
        hp: {
          cream: "rgb(var(--hp-cream) / <alpha-value>)",
          card: "rgb(var(--hp-card) / <alpha-value>)",
          tint: "rgb(var(--hp-tint) / <alpha-value>)",
          ink: "rgb(var(--hp-ink) / <alpha-value>)",
          body: "rgb(var(--hp-body) / <alpha-value>)",
          muted: "rgb(var(--hp-muted) / <alpha-value>)",
          faint: "rgb(var(--hp-faint) / <alpha-value>)",
          line: {
            DEFAULT: "rgb(var(--hp-line) / <alpha-value>)",
            soft: "rgb(var(--hp-line-soft) / <alpha-value>)",
            faint: "rgb(var(--hp-line-faint) / <alpha-value>)",
          },
          green: {
            DEFAULT: "rgb(var(--hp-green) / <alpha-value>)",
            pale: "rgb(var(--hp-green-pale) / <alpha-value>)",
            tint: "rgb(var(--hp-green-tint) / <alpha-value>)",
            wash: "rgb(var(--hp-green-wash) / <alpha-value>)",
            line: "rgb(var(--hp-green-line) / <alpha-value>)",
          },
          "note-tan": "rgb(var(--hp-note-tan) / <alpha-value>)",
          "note-yellow": "rgb(var(--hp-note-yellow) / <alpha-value>)",
          bubble: "rgb(var(--hp-bubble) / <alpha-value>)",
        },

        // Home landing page, sky direction (design_handoff_birdsong_landing,
        // `Birdsong Landing.dc.html`) — `/` only. A fourth marketing
        // namespace; see the --bsl-* block in app/globals.css for why it is
        // not folded into `hp` above.
        bsl: {
          cream: {
            DEFAULT: "rgb(var(--bsl-cream) / <alpha-value>)",
            soft: "rgb(var(--bsl-cream-soft) / <alpha-value>)",
            dim: "rgb(var(--bsl-cream-dim) / <alpha-value>)",
            alt: "rgb(var(--bsl-cream-alt) / <alpha-value>)",
          },
          card: "rgb(var(--bsl-card) / <alpha-value>)",
          ink: "rgb(var(--bsl-ink) / <alpha-value>)",
          body: {
            DEFAULT: "rgb(var(--bsl-body) / <alpha-value>)",
            soft: "rgb(var(--bsl-body-soft) / <alpha-value>)",
          },
          muted: "rgb(var(--bsl-muted) / <alpha-value>)",
          faint: "rgb(var(--bsl-faint) / <alpha-value>)",
          line: {
            DEFAULT: "rgb(var(--bsl-line) / <alpha-value>)",
            soft: "rgb(var(--bsl-line-soft) / <alpha-value>)",
            card: "rgb(var(--bsl-card-line) / <alpha-value>)",
          },
          forest: {
            DEFAULT: "rgb(var(--bsl-forest) / <alpha-value>)",
            deep: "rgb(var(--bsl-forest-deep) / <alpha-value>)",
            ink: "rgb(var(--bsl-forest-ink) / <alpha-value>)",
          },
          sage: {
            DEFAULT: "rgb(var(--bsl-sage) / <alpha-value>)",
            mid: "rgb(var(--bsl-sage-mid) / <alpha-value>)",
          },
          bubble: "rgb(var(--bsl-bubble) / <alpha-value>)",
          butter: {
            DEFAULT: "rgb(var(--bsl-butter) / <alpha-value>)",
            soft: "rgb(var(--bsl-butter-soft) / <alpha-value>)",
          },
          sand: {
            DEFAULT: "rgb(var(--bsl-sand) / <alpha-value>)",
            soft: "rgb(var(--bsl-sand-soft) / <alpha-value>)",
          },
          sky: {
            DEFAULT: "rgb(var(--bsl-sky) / <alpha-value>)",
            mid: "rgb(var(--bsl-sky-mid) / <alpha-value>)",
            pale: "rgb(var(--bsl-sky-pale) / <alpha-value>)",
          },
          horizon: "rgb(var(--bsl-horizon) / <alpha-value>)",
          live: "rgb(var(--bsl-live) / <alpha-value>)",
          well: {
            DEFAULT: "rgb(var(--bsl-well) / <alpha-value>)",
            dot: "rgb(var(--bsl-well-dot) / <alpha-value>)",
            line: "rgb(var(--bsl-well-line) / <alpha-value>)",
          },
          flock: "rgb(var(--bsl-flock) / <alpha-value>)",
        },

        // Respondent survey, sky direction
        // (design_handoff_respondent_survey_sky) — /study/[slug] only. Its own
        // namespace rather than a reuse of bsl-* above: the two surfaces share
        // a look and a sky, not a palette, and this one has a second theme
        // (night) that the homepage does not. See the --study-* block in
        // app/globals.css.
        study: {
          // Text on the sky.
          cream: "rgb(var(--study-cream) / <alpha-value>)",
          // Text on the frosted cards, and the fill of every dark control.
          ink: "rgb(var(--study-ink) / <alpha-value>)",
          muted: "rgb(var(--study-muted) / <alpha-value>)",
          // Chip and input fill, and the text colour on an ink fill.
          chip: "rgb(var(--study-chip) / <alpha-value>)",
          hair: "rgb(var(--study-hair) / <alpha-value>)",
          highlight: "rgb(var(--study-highlight) / <alpha-value>)",
          danger: "rgb(var(--study-danger) / <alpha-value>)",
          flock: "rgb(var(--study-flock) / <alpha-value>)",
          // Alpha is part of these four, so they carry whole values and have
          // no <alpha-value> slot.
          card: "var(--study-card)",
          "card-line": "var(--study-card-line)",
          glass: "var(--study-glass)",
          "glass-line": "var(--study-glass-line)",
        },
      },
      borderRadius: {
        card: "var(--ds-radius-card)",
        control: "var(--ds-radius-control)",
        account: "var(--ds-radius-account)",
        pill: "var(--ds-radius-pill)",
      },
      boxShadow: {
        // Home landing page v2 — the tilted hero notes, the white product
        // mock inside the pale-green panel, and the step badges' hard offset.
        "hp-note": "0 10px 30px rgba(27, 31, 28, 0.12)",
        "hp-note-deep": "0 10px 30px rgba(27, 31, 28, 0.16)",
        "hp-mock": "0 20px 60px rgba(27, 31, 28, 0.12)",
        "hp-badge": "3px 3px 0 #1b1f1c",
        // The three cards inside the sky direction's demo well on `/`.
        // Named -demo-card, not -card: a key that also exists in
        // theme.colors makes `shadow-<key>` ambiguous, and the colour
        // utility wins, which silently paints an opaque shadow in that
        // colour. Same reason the nav shadow below is not called bsl-nav.
        // A hairline top highlight plus a wide, high-offset ambient shadow —
        // the handoff gives it as one value and every card uses it.
        "bsl-demo-card": "0 1px 0 rgba(0, 0, 0, 0.03), 0 24px 48px -28px rgba(40, 50, 40, 0.3)",
        // The sky direction's nav pill. A single wide, downward, heavily
        // negative-spread shadow: the bar is frosted glass with no fill of
        // its own, so this is what separates it from the sky rather than any
        // edge of the bar itself.
        "bsl-nav": "0 8px 30px -12px rgba(20, 40, 60, 0.25)",
        // The respondent survey's frosted cards, and the lift its primary
        // buttons take on hover. Named -float/-press rather than -card/-cta:
        // `study.card` is a colour key, and a shadow sharing a colour's name
        // resolves to the colour, which silently paints an opaque block (see
        // the bsl-demo-card note above).
        "study-float": "0 30px 60px rgba(20, 30, 45, 0.18)",
        "study-press": "0 12px 26px rgba(20, 24, 30, 0.22)",
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
        // Sidebar-only: the wordmark, the nav item label, and the two lines
        // of the account row. `account` and `role` are half-pixel steps
        // because the row has a hard 228px width budget — see AdminSidebar.
        wordmark: ["21px", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        nav: ["15px", { lineHeight: "1.2", letterSpacing: "-0.005em" }],
        account: ["12.5px", { lineHeight: "1.2" }],
        role: ["10.5px", { lineHeight: "1.2" }],
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
        // Home landing page redesign (design_handoff_birdsong_landing) —
        // Plus Jakarta Sans for every heading, button, eyebrow and label on
        // `/`, with DM Sans (font-dmsans above) still carrying body copy.
        // Applied at HomeShell, so the global `sans` default is untouched.
        jakarta: [
          "var(--font-plus-jakarta)",
          "var(--font-dm-sans)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        // Home landing page v2 (design_handoff_birdsong_landing). Applied at
        // HomeShell, so the global `sans` default is untouched — same
        // arrangement as bricolage/jakarta above.
        "hp-serif": ["var(--font-instrument-serif)", "Georgia", "serif"],
        "hp-wordmark": ["var(--font-source-serif)", "Georgia", "serif"],
        "hp-sans": [
          "var(--font-instrument-sans)",
          "Helvetica Neue",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        "hp-hand": ["var(--font-caveat)", "cursive"],

        // Home landing page, sky direction (`/`). Instrument Serif
        // carries every headline, the nav wordmark and the fit score; Caveat
        // sets the two handwritten annotations. Separate names from the
        // hp-* trio above even where the face is the same, so moving one
        // direction off a face does not touch the other. Applied at SkyShell.
        "bsl-serif": ["var(--font-instrument-serif)", "Georgia", "serif"],
        // system-ui ahead of the Helvetica stack that hp-sans uses, because
        // that is the handoff's own fallback and the page has glyphs
        // Instrument Sans does not ship — the "Book a demo →" arrow among
        // them. On macOS that resolves to SF Pro, whose U+2192 is 2px
        // narrower than Helvetica Neue's; with the Helvetica stack the two
        // CTAs measured 2.3px wide against the reference.
        "bsl-sans": ["var(--font-instrument-sans)", "system-ui", "sans-serif"],
        // The nav wordmark, and nothing else on the page. v5 moved "Birdsong"
        // off Instrument Serif onto Bricolage Grotesque 700, so the mark no
        // longer shares a face with the headlines it sits above.
        "bsl-display": ["var(--font-bricolage)", "system-ui", "sans-serif"],
        "bsl-hand": ["var(--font-caveat)", "cursive"],
        // The "→" in the three CTAs. Instrument Sans has no U+2192, so the
        // glyph comes from a fallback either way — but next/font bakes a
        // metrics-adjusted local face into --font-instrument-sans and *that*
        // is what gets used, drawing an arrow 2.3px wider and visibly heavier
        // than the reference's. Naming system-ui directly reproduces the
        // handoff's own stack, so the arrow resolves the same way its
        // prototype does, on every platform rather than just this one.
        "bsl-glyph": ["system-ui", "sans-serif"],

        // Respondent survey, sky direction (/study/[slug]). The same three
        // faces the homepage ships, under their own names so either surface
        // can move off one without dragging the other: Instrument Serif for
        // every headline, Instrument Sans for everything else, and Bricolage
        // Grotesque for the one "Birdsong" wordmark in the header pill.
        // Applied at StudyThemeProvider.
        "study-serif": ["var(--font-instrument-serif)", "Georgia", "serif"],
        "study-sans": ["var(--font-instrument-sans)", "system-ui", "sans-serif"],
        "study-display": ["var(--font-bricolage)", "system-ui", "sans-serif"],
        // The "→" in the CTAs. Instrument Sans ships no U+2192, and the
        // metrics-adjusted local face next/font bakes into the variable draws
        // a heavier arrow than the reference; naming system-ui directly is
        // what reproduces the handoff's own stack. See bsl-glyph above.
        "study-glyph": ["system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
