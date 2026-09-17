"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./SignOutButton";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_COOKIE = "sidebar_collapsed";

// Icon set redesigned per design_handoff_create_survey: 19px, 1.4px stroke,
// rounder/thinner than the old Feather-style set — same four routes, new
// paths lifted directly from the handoff for pixel fidelity.
function HomeIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 18 18" fill="none" className="shrink-0">
      <path d="M3 8l6-5 6 5v7a1 1 0 01-1 1H4a1 1 0 01-1-1V8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function LeadsIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 18 18" fill="none" className="shrink-0">
      <circle cx="6.6" cy="6.2" r="2.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 14.6c0-2.6 2.1-4 4.6-4s4.6 1.4 4.6 4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M11.8 4.2a2.4 2.4 0 010 4.3M13.4 10.9c1.6.6 2.6 1.9 2.6 3.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function SurveysIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 18 18" fill="none" className="shrink-0">
      <rect x="3.5" y="2.5" width="11" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <line x1="6" y1="6.5" x2="12" y2="6.5" stroke="currentColor" strokeWidth="1.3" />
      <line x1="6" y1="9.5" x2="12" y2="9.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

// One caret, not an up/down stepper: the row opens a menu, it does not step
// through values. Points down at rest, flips up while the menu is open.
// 45% at rest, 80% on hover — keyed off the row (group) so hovering the name
// or the avatar lifts it too, not just the glyph itself.
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      className={cn(
        "shrink-0 text-sidebar-muted opacity-45 transition-[transform,opacity] duration-200 ease-in-out group-hover:opacity-80",
        open && "rotate-180"
      )}
    >
      <path d="M4 6.5l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

// The account avatar: a 30px indigo squircle carrying the initials. Never
// the logo mark — that identifies the product rather than the person whose
// name sits beside it, and a dark tile on a near-black rail reads as a
// smudge. The fill is the one saturated colour on the sidebar for exactly
// that reason, but muted (#5f6bab, not the old #8ea4e8 circle) so it stops
// being the loudest thing on a dark rail. Same 30px / rounded-control
// geometry as the logo mark at the top of the rail, so the two agree.
function AccountAvatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-control bg-sidebar-avatar font-archivo text-micro font-semibold text-sidebar-avatar-foreground"
    >
      {initialsOf(name)}
    </span>
  );
}

// Points left (collapse) by default, flips to point right (expand) when the
// rail is already collapsed.
function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      className={cn("shrink-0 transition-transform duration-200 ease-in-out", collapsed && "rotate-180")}
    >
      <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Live is not a nav destination: it is reached from the Leads page, and
// the Leads item stays lit while you are on it.
const NAV_ITEMS = [
  { href: "/admin", label: "Home", icon: HomeIcon, also: [] as string[] },
  { href: "/admin/leads", label: "Leads", icon: LeadsIcon, also: ["/admin/live"] },
  { href: "/admin/surveys", label: "Projects", icon: SurveysIcon, also: [] as string[] },
];

export function AdminSidebar({
  userName,
  userRole,
  initialCollapsed,
}: {
  userName: string | null;
  /** The person's role in the organization, already a display label. */
  userRole: string | null;
  initialCollapsed: boolean;
}) {
  const pathname = usePathname();
  // Seeded from a cookie read server-side (app/admin/layout.tsx), so the
  // first paint already renders the right width — no expand/collapse flash
  // on load. A cookie rather than localStorage so the server-rendered HTML
  // can agree with the client on the very first render.
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  // Click-toggled, not hover-revealed: matches the account popover's
  // previous interaction model (works for touch/keyboard, no lost-hover gap
  // to cross).
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${next ? "1" : "0"}; path=/admin; max-age=31536000; samesite=lax`;
      return next;
    });
  }, []);

  // Cmd+B / Ctrl+B toggles the rail from anywhere, except while typing in a
  // field (Cmd+B is also "bold" in rich text inputs elsewhere in admin).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "b") return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      e.preventDefault();
      toggleCollapsed();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleCollapsed]);

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

  // Navigating anywhere closes the menu (e.g. after choosing Settings).
  useEffect(() => {
    setAccountOpen(false);
  }, [pathname]);

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col bg-sidebar pb-3.5 pt-[22px] transition-[width] duration-200 ease-in-out",
        collapsed ? "w-16" : "w-[240px]"
      )}
    >
      <div
        className={cn(
          "mb-[30px] flex items-center",
          collapsed ? "flex-col gap-2 px-2" : "justify-between gap-3 px-4"
        )}
      >
        <div className={cn("flex items-center gap-3", collapsed && "flex-col gap-2")}>
          <Image
            src="/favicon-512.png"
            alt="Birdsong"
            width={30}
            height={30}
            className="block shrink-0 rounded-control"
          />
          {!collapsed && (
            <span className="font-spectral text-wordmark font-semibold text-sidebar-active-foreground">
              Birdsong
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={`${collapsed ? "Expand" : "Collapse"} sidebar (⌘B)`}
          className="focus-visible:ring-offset-sidebar flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-sidebar-foreground transition-colors duration-[130ms] ease-in-out hover:bg-sidebar-accent hover:text-sidebar-active-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-active-foreground focus-visible:ring-offset-2"
        >
          <CollapseIcon collapsed={collapsed} />
        </button>
      </div>

      {!collapsed && (
        <div className="type-eyebrow mb-2.5 px-4 text-sidebar-label">
          Workspace
        </div>
      )}

      <nav className={cn("flex flex-col gap-1", collapsed ? "px-3" : "px-4")}>
        {NAV_ITEMS.map((item) => {
          // "/admin" is a prefix of every other admin route, so it needs an
          // exact-match carve-out to avoid lighting up alongside whichever
          // other item actually matches the current page.
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : [item.href, ...item.also].some(
                  (href) => pathname === href || pathname.startsWith(`${href}/`)
                );
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={collapsed ? item.label : undefined}
              className={cn(
                "group relative flex items-center rounded-control font-archivo text-nav font-medium transition-colors duration-[130ms] ease-in-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-active-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                collapsed ? "h-10 w-10 justify-center" : "gap-3 px-3 py-3",
                isActive
                  ? "bg-sidebar-accent text-sidebar-active-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-active-foreground"
              )}
            >
              {isActive && (
                <span
                  className={cn(
                    "absolute inset-y-[9px] w-[3px] rounded-r-control bg-brand-live",
                    collapsed ? "left-[-18px]" : "left-[-22px]"
                  )}
                />
              )}
              <Icon />
              {!collapsed && <span>{item.label}</span>}
              {collapsed && (
                <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-control border border-border bg-card px-2.5 py-1.5 text-sm text-card-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* The account row. Pinned to the rail's bottom (mt-auto), it toggles a
          menu with Company profile, Settings and Sign out (outside click and
          Escape dismiss it) — those three have to live somewhere, and the
          main nav doesn't include them. Company profile sits here rather than
          in the nav because it is account-scoped setup you visit
          occasionally, not one of the four workspace destinations you move
          between.

          One quiet plate, no divider: a full-width rule across the rail read
          as a seam cutting the panel in half. The plate's own edge
          (--ds-sidebar-plate at 6%) separates the footer from the nav on its
          own, and its 3% fill lifts to 6% on hover and while the menu is
          open.

          Width budget, 240px of rail: 16px rail padding x2, 10px plate
          padding x2, 1px border x2, 30px avatar, 10px gap, 12px chevron
          leaves ~124px for the name, and "Charlie Cohen" needs ~86px at
          12.5px Archivo 600.

          Collapsed rail: 64px fits only the avatar, so the text and chevron
          drop and the plate shrinks to a square. */}
      <div
        ref={accountRef}
        // px-4 expanded, matching the nav above rather than the spec's 12px:
        // our rail is 240px, not the 228px the spec was drawn against, so the
        // plate lines up with the nav pills. The extra 12px of rail more than
        // covers the wider padding in the name's width budget.
        className={cn("group relative mb-1.5 mt-auto", collapsed ? "px-3" : "px-4")}
      >
        <button
          type="button"
          onClick={() => setAccountOpen((prev) => !prev)}
          aria-haspopup="menu"
          aria-expanded={accountOpen}
          aria-label={collapsed ? `Account menu for ${userName ?? "Account"}` : "Account menu"}
          className={cn(
            // transition-colors carries its own 150ms; an arbitrary
            // duration-[140ms] would be silently dropped, because
            // tailwindcss-animate claims duration-* for animation-duration.
            "flex items-center rounded-account border border-sidebar-plate/[0.06] bg-sidebar-plate/[0.03] text-left transition-colors hover:bg-sidebar-plate/[0.06]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-active-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
            collapsed ? "h-10 w-10 justify-center" : "w-full gap-2.5 px-2.5 py-2",
            accountOpen && "bg-sidebar-plate/[0.06]"
          )}
        >
          <AccountAvatar name={userName ?? "Account"} />
          {!collapsed && (
            <>
              {/* Archivo, not Spectral: a serif at 13.5px in a 240px rail
                  read oversized and soft beside the sans nav above it.
                  12.5px/600 for the name, 10.5px/500 at 38% for the role — a
                  tight two-line block the height of the avatar beside it.
                  Archivo rather than the handoff's Inter because admin's body
                  sans is Archivo; see DESIGN.md. */}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-archivo text-account font-semibold text-sidebar-active-foreground">
                  {userName ?? "Account"}
                </span>
                <span className="mt-0.5 block whitespace-nowrap font-archivo text-role font-medium text-sidebar-muted/[0.38]">
                  {userRole ?? "Admin"}
                </span>
              </span>
              <ChevronIcon open={accountOpen} />
            </>
          )}
        </button>

        {collapsed && !accountOpen && (
          <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-control border border-border bg-card px-2.5 py-1.5 text-sm text-card-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
            {userName ?? "Account"}
          </span>
        )}

        {/* Standard light popover (card surface, border, shadow — the
            design system's menu treatment), toggled by the button above.
            Collapsed rail: flies out beside the rail instead of sitting
            above the account row (64px is too narrow for menu text). */}
        <div
          role="menu"
          className={cn(
            "absolute z-50 rounded-card border border-border bg-card p-1.5 shadow-lg transition-opacity duration-150",
            // Expanded: aligned to the plate's edges (px-4), not to the rail.
            collapsed ? "bottom-0 left-full ml-2 w-48" : "bottom-full left-4 right-4 mb-1.5",
            accountOpen ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        >
          <Link
            href="/admin/profile"
            role="menuitem"
            onClick={() => setAccountOpen(false)}
            className="focus-ring block rounded-control px-3 py-3 font-archivo text-sm text-card-foreground transition-colors hover:bg-secondary"
          >
            Company profile
          </Link>
          <Link
            href="/admin/settings"
            role="menuitem"
            onClick={() => setAccountOpen(false)}
            className="focus-ring block rounded-control px-3 py-3 font-archivo text-sm text-card-foreground transition-colors hover:bg-secondary"
          >
            Settings
          </Link>
          <Link
            href="/admin/settings/team"
            role="menuitem"
            onClick={() => setAccountOpen(false)}
            className="focus-ring block rounded-control px-3 py-3 font-archivo text-sm text-card-foreground transition-colors hover:bg-secondary"
          >
            Team
          </Link>
          <SignOutButton className="focus-ring block w-full rounded-control px-3 py-3 text-left font-archivo text-sm text-card-foreground transition-colors hover:bg-secondary hover:text-card-foreground" />
        </div>
      </div>
    </aside>
  );
}
