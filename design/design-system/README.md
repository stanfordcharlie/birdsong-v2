# Birdsong Admin

The admin side of Birdsong is a CRM. Anyone who has used HubSpot, Attio or Salesforce should be able to sit down and work the lead queue without a tour. The design follows from that: dense but calm, one accent, numbers in mono, borders instead of shadows, and motion only where something is actually live.

Source of truth in code: the `--ds-*` custom properties in `app/globals.css` and the primitives in `components/admin/ui/`. This system is the reference those are built from. If they ever disagree, fix the code, then update this.

## Principles

1. **CRM first.** Tables, filters, badges, assignees, bulk actions. Familiar patterns over clever ones. If a CRM user would expect a control somewhere, put it there.
2. **One accent.** `accent` (teal) is the only color that means "act" or "good". Status colors exist for badges and dots and nowhere else. Never a second brand hue.
3. **Numbers are mono.** Scores, counts, timestamps, turn numbers and keyboard hints set in `mono`. Everything else is `sans`. A number in the body face is a mistake.
4. **Borders, not shadows.** Cards are `bg` with a 1px `border` and `radius-card`. The only shadows are the input lift, the active nav ring and the floating bar.
5. **Less text.** No subtitles under page titles. A stat label is two words. A status is one. If a sentence explains a control, the control is wrong.
6. **Motion means live.** Waveforms breathe and dots pulse only while an interview is running. Page-load enters are one pass, 550ms, staggered. Nothing loops that isn't live.

## The shell

Every admin page is the same frame:

- **Sidebar** `shell-sidebar` (240px) on `bg-sidebar` with a right `border`. Top to bottom: wordmark, search-or-jump input with a `⌘K` hint in `mono-kbd`, Workspace nav (Home, Live, Leads, Projects), Active studies list with a plus, then the account row at the bottom with a gear that opens Settings. Company profile and Settings are not nav items.
- **Top bar** `shell-topbar` (56px), bottom `border`. Breadcrumb left in `control` weight, page actions right. Primary action is the rightmost button and is the only `accent` fill in the bar.
- **Content** padded `space-7` top, `space-8` sides. Home caps content at 1080px; every other page uses the full width.

Active nav item: `bg` ground, `shadow-active-nav`, `ink` text at 700. Inactive: `muted` at 600. Counts on nav items in `mono-count`.

## Color

Grounds: `bg` for pages and cards, `bg-sidebar` for the sidebar, table header rows and tinted panels, `bg-track` for segmented controls and progress tracks. One dark ground, `ink`, reserved for the worth-a-call card and the floating action bar.

Text: `ink` for primary, `ink-3` for secondary cell text, `muted-2` for labels and second lines. `muted-3` only for placeholders and hints, never for information.

Accent: `accent` fills primary buttons, live dots, the active tab underline, progress fills and the score-9 chip. `accent-weak` is its tinted ground for chips, badges and the active filter. `accent-bright` appears only on `ink` grounds: the wordmark bars, the avatar, the ring and the Triage button.

Status, badges only:

| State | Dot | Ground | Text |
| --- | --- | --- | --- |
| New | `status-new` | `status-new-bg` | `status-new-text` |
| Contacted | `muted-2` | `bg-track` | `ink-3` |
| Meeting booked | `warn` | `warn-bg-badge` | `warn-text` |
| In HubSpot | `accent` | `accent-weak` | `accent` |
| Failed, needs attention | `danger` | none | inherits |

Banned on admin surfaces: beige, cream, gradients, blobs, pill buttons (other than the floating bar), left-border cards, a second accent.

## Type

`sans` is Manrope, loaded from Google Fonts at 400, 500, 600, 700, 800. `mono` is IBM Plex Mono at 400 and 500. No Young Serif, no Archivo, no Inter anywhere in `app/admin/**`.

- Page title: `h1`. No subtitle under it.
- Card and study titles: `card-title`.
- Big numbers in stat rows: `stat`.
- Table primary cell: `row-primary`, second line `caption` in `muted-2`.
- Buttons, tabs, filter chips: `control`.
- Section labels in the sidebar and above lists: `eyebrow` in `muted-3`.
- Scores and fit: `mono-chip`. Counts and timestamps: `mono-count`. Keyboard hints: `mono-kbd`.

## Layout scale

Spacing is a 4px scale, `space-1` to `space-8`. Controls in bars and filter rows are `control-h` (34px) tall. Staggered table rows are `row-h` (60px); header rows 42px; single-line rows 54px. Radii: `radius-chip` (8) for chips and badges, `radius-control` (10) for buttons and inputs, `radius-card` (14) for cards and tables, `radius-hero` (18) for the Home hero card, `radius-pill` for the floating bar only.

## Page anatomy

- **Home:** greeting `h1`, the study launcher input, then the worth-a-call card beside Needs you, then Live now. Nothing else.
- **Leads:** stat row (five), segmented tabs plus filter row on one line, full-width table with checkbox, Respondent (name over title), Company (company over study), Score, Fit, Status, Assignee, Last activity. Checking rows shows the floating bulk bar.
- **Lead detail:** score tile, name, tabs (Transcript, Summary, Call script, Activity), transcript left, Details and Why it scored right, floating action bar pinned bottom center.
- **Projects:** tabs, search, study cards with a flat `accent-weak` cover carrying a waveform, archived studies as rows, a dashed New study card.
- **Study detail:** title with Live badge, stat row (five), tabs with search and a toggle on the right, responses table, Interview quality card.
- **New study:** a conversation on the left with the input pinned to the bottom of its panel, the brief building live on the right on `bg-sidebar`.
- **Settings:** left sub-nav (Company profile, Account, Notifications, Integrations, Team, Billing), content in cards with an Edit link in each header.

## Iconography

16px line icons, 1.5px stroke, round caps and joins, `currentColor`. Lucide is the reference set. Sidebar icons at 16px, top bar and inline icons at 14px. No filled icons, no two-tone.

The waveform is brand language, not decoration: a row of vertical bars (3px wide, 2 to 3px gap, `radius-chip` ends) in `accent` on light grounds or `accent-bright` on ink. It appears wherever Birdsong is listening or has listened: live rows, study covers, the wordmark. It animates only while live.

## Copy

- Plain and short. No em dashes anywhere in user-visible strings.
- The word "survey" is banned. "Study" for one, "Projects" for the section.
- Nothing respondent-facing mentions leads, scores or sales.
- Stat labels are nouns: "Worth a call", "Unworked", "Meetings booked".
- Buttons are verbs: "Push to HubSpot", "Copy call script", "Triage the 4".

## Motion

- Enter: cards fade up 10px over `duration-enter` with `ease-out`, staggered 80ms in reading order. Once per page load.
- Count-up: stat numbers and the ring on the worth-a-call card over `duration-count`.
- Live: waveform bars scale from 25% to 100% on a `duration-wave` loop with per-bar delay; the live dot pulses a ring on `duration-pulse`.
- No hover motion beyond color. No transitions on layout.

## Third-party marks

Integration tiles (HubSpot, Slack) use each company's official logo from their brand kit, dropped into a 40px `radius-control` tile on the vendor's brand color. Never redraw or approximate a mark.
