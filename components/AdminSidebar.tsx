"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { GlobalSearch } from "@/components/admin/GlobalSearch";
import { SignOutButton } from "./SignOutButton";
import { cn } from "@/lib/utils";
import { BirdsongMark } from "@/components/brand/BirdsongMark";

// Built from design/mockups/Sidebar.html. 240px, fixed: there is no collapsed
// state. Every colour, radius and shadow is a Ledger II token (app/globals.css,
// `.admin-theme`); the pixel geometry is the mockup's.

export type SidebarStudy = {
  id: string;
  title: string;
  status: "live" | "draft";
  /** Responses so far. Null when the count could not be read; then nothing is shown. */
  responseCount: number | null;
};

export type SidebarData = {
  studies: SidebarStudy[];
  /** Leads nobody has picked up. Null omits the count. */
  unworkedLeads: number | null;
  /** Interviews running now. Null omits the pill. */
  liveCount: number | null;
  /** Whether this person may start a study; hides the plus otherwise. */
  canCreateStudy: boolean;
};

const ICON_PROPS = {
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  className: "shrink-0",
} as const;

function HomeIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M2.5 7 8 2.5 13.5 7v6.5h-11z" />
    </svg>
  );
}

function LiveIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="8" cy="8" r="2" />
      <path d="M4.5 4.5a5 5 0 0 0 0 7M11.5 4.5a5 5 0 0 1 0 7" />
    </svg>
  );
}

function LeadsIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="6" cy="5.5" r="2.5" />
      <path d="M1.5 13.5a4.5 4.5 0 0 1 9 0M10.5 3.5a2.5 2.5 0 0 1 0 4M12 9.5a4 4 0 0 1 2.5 4" />
    </svg>
  );
}

function ProjectsIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
      <path d="M5.5 6h5M5.5 8.5h5M5.5 11h3" />
    </svg>
  );
}

// Lucide's Settings, the gear everyone already knows. absoluteStrokeWidth
// keeps the stroke at 1.5px on screen: the icon is drawn on a 24 unit grid
// and rendered at 16.
function GearIcon() {
  return <Settings size={16} strokeWidth={1.5} absoluteStrokeWidth aria-hidden className="shrink-0" />;
}

// The wordmark tile: the bird mark on an ink ground, in the 24x24 square the
// waveform tile it replaced occupied, so the lockup beside it does not move.
// The bird is drawn in --ds-accent-bright, the colour the waveform bars were:
// the tile is ink, and a black mark on ink is not a mark.
function Mark() {
  return (
    <span
      aria-hidden
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px]"
      style={{ background: "hsl(var(--ds-ink))", color: "hsl(var(--ds-accent-bright))" }}
    >
      <BirdsongMark size={15} />
    </span>
  );
}

// "Charlie Cohen" -> "CC", "Charlie" -> "CH". Derived from the same string
// the row displays, so the tile can never disagree with the name beside it
// and never comes out blank.
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const FOCUS = "focus-ring";
const ACTIVE =
  "bg-[color:hsl(var(--ds-bg))] font-bold text-[color:hsl(var(--ds-ink))] [box-shadow:var(--ds-shadow-active-nav)]";
const NAV_ITEM = "flex h-[36px] items-center gap-[10px] rounded-[var(--ds-radius-chip)] px-[10px]";
const NAV_IDLE =
  "font-semibold text-[color:hsl(var(--ds-muted))] hover:text-[color:hsl(var(--ds-ink))]";
const MONO = "[font-family:var(--font-mono)]";

// A link clicked with the pointer gives its focus up once the click has
// landed. Left focused, it is promoted to :focus-visible by the next key
// press (a shortcut, a screenshot chord) and the ring appears around the
// item that is already marked active. A keyboard activation reports
// detail 0 and keeps its focus, and its ring.
function releasePointerFocus(event: React.MouseEvent<HTMLElement>) {
  if (event.detail > 0) event.currentTarget.blur();
}

function under(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({
  userName,
  workspaceName,
  data,
}: {
  userName: string | null;
  /** The organization's name, shown under the person's. */
  workspaceName: string | null;
  data: SidebarData;
}) {
  const pathname = usePathname() ?? "";
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // Dismiss the account menu on outside click or Escape.
  useEffect(() => {
    if (!accountOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setAccountOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen]);

  // Navigating anywhere closes the menu.
  useEffect(() => {
    setAccountOpen(false);
  }, [pathname]);

  // A study in the list lights its own row, not Projects: the row is the
  // more specific answer to "where am I".
  const activeStudy = data.studies.find((study) => under(pathname, `/admin/projects/${study.id}`));
  const onSettings = under(pathname, "/admin/settings");

  const nav = [
    { href: "/admin", label: "Home", icon: HomeIcon, active: pathname === "/admin" },
    { href: "/admin/live", label: "Live", icon: LiveIcon, active: under(pathname, "/admin/live") },
    {
      href: "/admin/leads",
      label: "Leads",
      icon: LeadsIcon,
      // A lead's own page is part of Leads.
      active: under(pathname, "/admin/leads") || under(pathname, "/admin/responses"),
    },
    {
      href: "/admin/projects",
      label: "Projects",
      icon: ProjectsIcon,
      active: under(pathname, "/admin/projects") && !activeStudy,
    },
  ];

  const name = userName ?? "Account";

  return (
    <aside className="sticky top-0 flex h-screen w-[240px] shrink-0 flex-col gap-[18px] border-r border-[color:hsl(var(--ds-border))] bg-[color:hsl(var(--ds-bg-sidebar))] px-[14px] pb-[14px] pt-[18px] text-[14px] text-[color:hsl(var(--ds-ink))]">
      <Link
        href="/admin"
        onClick={releasePointerFocus}
        className={cn(FOCUS, "flex items-center gap-[10px] rounded-[var(--ds-radius-chip)] px-2 py-1")}
      >
        <Mark />
        <span className="text-[16px] font-extrabold tracking-[-0.02em]">Birdsong</span>
      </Link>

      {/* The field is the palette: GlobalSearch owns the query and its
          results, and SearchShortcut's ⌘K focuses the first search field in
          the document, which is this one on every admin page. The results
          open wider than the rail so a name and its study fit on a line. */}
      <GlobalSearch
        placeholder="Search or jump"
        className="[&>div]:left-0 [&>div]:right-auto [&>div]:w-[340px] [&_label]:h-[36px]"
      />

      <nav aria-label="Workspace" className="flex flex-col gap-[2px]">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              onClick={releasePointerFocus}
              className={cn(FOCUS, NAV_ITEM, item.active ? ACTIVE : NAV_IDLE)}
            >
              <Icon />
              {item.label}
              {item.label === "Live" && data.liveCount !== null && data.liveCount > 0 && (
                <span
                  className={cn(
                    MONO,
                    "ml-auto rounded-[var(--ds-radius-control)] bg-[color:hsl(var(--ds-accent-weak))] px-[7px] py-px text-[12px] font-normal text-[color:hsl(var(--ds-accent))]"
                  )}
                >
                  {data.liveCount}
                </span>
              )}
              {item.label === "Leads" && data.unworkedLeads !== null && data.unworkedLeads > 0 && (
                <span
                  className={cn(MONO, "ml-auto text-[12px] font-normal text-[color:hsl(var(--ds-muted-2))]")}
                >
                  {data.unworkedLeads}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex min-h-0 flex-col gap-[2px]">
        <div className="flex items-center justify-between px-[10px] pb-[6px]">
          <span className="ds-eyebrow text-[color:hsl(var(--ds-muted-3))]">Active studies</span>
          {data.canCreateStudy && (
            <Link
              href="/admin/projects/new"
              aria-label="New study"
              className={cn(
                FOCUS,
                "flex h-5 w-5 items-center justify-center rounded-[6px] border border-[color:hsl(var(--ds-border))] bg-[color:hsl(var(--ds-bg))] text-[color:hsl(var(--ds-muted))] hover:text-[color:hsl(var(--ds-ink))]"
              )}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M8 3v10M3 8h10" />
              </svg>
            </Link>
          )}
        </div>

        <div className="flex min-h-0 flex-col gap-[2px] overflow-y-auto">
          {data.studies.map((study) => {
            const live = study.status === "live";
            const active = activeStudy?.id === study.id;
            return (
              <Link
                key={study.id}
                href={`/admin/projects/${study.id}`}
                title={study.title}
                aria-current={active ? "page" : undefined}
                onClick={releasePointerFocus}
                className={cn(
                  FOCUS,
                  "flex h-[34px] shrink-0 items-center gap-[10px] rounded-[var(--ds-radius-chip)] px-[10px] text-[13px]",
                  active
                    ? "bg-[color:hsl(var(--ds-bg))] font-bold text-[color:hsl(var(--ds-ink))] shadow-[0_0_0_1px_hsl(var(--ds-border))]"
                    : cn(
                        "font-semibold hover:text-[color:hsl(var(--ds-ink))]",
                        live ? "text-[color:hsl(var(--ds-ink-3))]" : "text-[color:hsl(var(--ds-muted))]"
                      )
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "h-[6px] w-[6px] shrink-0 rounded-full",
                    live ? "bg-[color:hsl(var(--ds-accent))]" : "bg-[color:hsl(var(--ds-border-dashed))]"
                  )}
                />
                <span className="truncate">{study.title}</span>
                {live ? (
                  study.responseCount !== null && (
                    <span
                      className={cn(MONO, "ml-auto text-[11px] font-normal text-[color:hsl(var(--ds-muted-2))]")}
                    >
                      {study.responseCount}
                    </span>
                  )
                ) : (
                  <span className="ml-auto text-[11px] font-normal text-[color:hsl(var(--ds-muted-3))]">Draft</span>
                )}
              </Link>
            );
          })}
          {data.studies.length === 0 && (
            <p className="px-[10px] py-2 text-[12px] text-[color:hsl(var(--ds-muted-2))]">No studies yet</p>
          )}
        </div>
      </div>

      {/* The account row. The name opens a small menu for the three things
          that have no other home in the rail (Company profile, Team, Sign
          out); the gear goes straight to Settings. */}
      <div
        ref={accountRef}
        className="relative mt-auto flex items-center gap-[10px] border-t border-[color:hsl(var(--ds-border))] px-[6px] pt-3"
      >
        <button
          type="button"
          onClick={() => setAccountOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={accountOpen}
          aria-label={`Account menu for ${name}`}
          className={cn(FOCUS, "flex min-w-0 flex-1 items-center gap-[10px] rounded-[var(--ds-radius-chip)] text-left")}
        >
          <span
            aria-hidden
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[color:hsl(var(--ds-accent-bright))] text-[12px] font-extrabold text-[color:hsl(var(--ds-ink))]"
          >
            {initialsOf(name)}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-bold">{name}</span>
            {workspaceName && (
              <span className="truncate text-[12px] text-[color:hsl(var(--ds-muted-2))]">{workspaceName}</span>
            )}
          </span>
        </button>
        <Link
          href="/admin/settings"
          aria-label="Settings"
          aria-current={onSettings ? "page" : undefined}
          onClick={releasePointerFocus}
          className={cn(
            FOCUS,
            "ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--ds-radius-chip)]",
            onSettings
              ? "bg-[color:hsl(var(--ds-bg))] text-[color:hsl(var(--ds-ink))] shadow-[0_0_0_1px_hsl(var(--ds-border))]"
              : "text-[color:hsl(var(--ds-muted-2))] hover:text-[color:hsl(var(--ds-ink))]"
          )}
        >
          <GearIcon />
        </Link>

        {accountOpen && (
          <div
            role="menu"
            className="absolute bottom-full left-0 right-0 z-50 mb-2 flex flex-col rounded-[var(--ds-radius-control)] border border-[color:hsl(var(--ds-border))] bg-[color:hsl(var(--ds-bg))] p-1 [box-shadow:var(--ds-shadow-input)]"
          >
            {[
              { href: "/admin/settings/profile", label: "Company profile" },
              { href: "/admin/settings/team", label: "Team" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setAccountOpen(false)}
                className={cn(
                  FOCUS,
                  "flex h-[34px] items-center rounded-[var(--ds-radius-chip)] px-[10px] text-[13px] font-semibold text-[color:hsl(var(--ds-ink-3))] hover:bg-[color:hsl(var(--ds-bg-sidebar))]"
                )}
              >
                {item.label}
              </Link>
            ))}
            <SignOutButton
              className={cn(
                FOCUS,
                "flex h-[34px] w-full items-center rounded-[var(--ds-radius-chip)] px-[10px] text-left text-[13px] font-semibold text-[color:hsl(var(--ds-ink-3))] hover:bg-[color:hsl(var(--ds-bg-sidebar))] hover:text-[color:hsl(var(--ds-ink-3))]"
              )}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
