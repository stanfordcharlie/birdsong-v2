# design/

Reference material for the admin redesign ("Ledger II"). Nothing in this folder is imported by the app.

- `design-system/README.md` is the brand book: principles, shell, color, type, page anatomy, motion, copy rules. Read this first.
- `design-system/tokens.json` is the token source: colors, type styles, spacing, radius, shadows, timing. Every value the code should use is here.
- `mockups/*.html` are the page mockups, one per admin page plus the shared sidebar. They are static reference, not runnable in the app (they depend on a preview runtime). Read the markup for exact layout, spacing and color values. Inline styles are intentional: each element carries its own values so nothing has to be traced.

Mapping to code:

| Mockup | Route |
| --- | --- |
| Home.html | app/admin/page.tsx |
| Leads.html | app/admin/leads/page.tsx |
| Lead.html | app/admin/responses/[id]/page.tsx |
| Projects.html | app/admin/surveys/page.tsx |
| Study.html | app/admin/surveys/[id]/page.tsx |
| NewStudy.html | app/admin/surveys/new (later prompt) |
| Profile.html | app/admin/settings, Company profile tab |
| Settings.html | app/admin/settings, Integrations tab |
| Sidebar.html | components/AdminSidebar.tsx |

Live design system: https://claude.ai/artifact/1xnGLgHD8CPwUyZAPDbuXK
Mockup canvas: https://claude.ai/artifact/RqgVYTohfPjQsUgeXozU6o
