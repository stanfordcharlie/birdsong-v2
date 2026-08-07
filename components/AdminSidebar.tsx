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

function CompanyProfileIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 18 18" fill="none" className="shrink-0">
      <rect x="3.5" y="4.5" width="11" height="11" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.5 4.5V3a1 1 0 011-1h3a1 1 0 011 1v1.5M6.3 8h5.4M6.3 11h3.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      className="shrink-0 text-[rgba(243,236,223,0.45)]"
    >
      <path d="M5 6l3-3 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Eight-point star, drawn purely by clipping a flat periwinkle square — no
// SVG, no image, no initial. Kept as a clip-path (rather than an inline SVG)
// so the hover spring below animates the element's own transform.
const STAR_CLIP =
  "polygon(50% 0%, 61% 26%, 87% 13%, 74% 39%, 100% 50%, 74% 61%, 87% 87%, 61% 74%, 50% 100%, 39% 74%, 13% 87%, 26% 61%, 0% 50%, 26% 39%, 13% 13%, 39% 26%)";

// The resting tilt and the hover spring both live in globals.css under
// .ws-star / .ws-user-row:hover — see the comment there for why they aren't
// Tailwind utilities.
function StarAvatar() {
  return (
    <span
      aria-hidden
      style={{ clipPath: STAR_CLIP }}
      className="ws-star block h-9 w-9 shrink-0 bg-[#8ea4e8]"
    />
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

const NAV_ITEMS = [
  { href: "/admin", label: "Home", icon: HomeIcon },
  { href: "/admin/leads", label: "Leads", icon: LeadsIcon },
  { href: "/admin/surveys", label: "Surveys", icon: SurveysIcon },
  { href: "/admin/profile", label: "Company profile", icon: CompanyProfileIcon },
];

export function AdminSidebar({
  userName,
  liveSurveyCount,
  initialCollapsed,
}: {
  userName: string | null;
  liveSurveyCount: number;
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
          collapsed ? "flex-col gap-2 px-2" : "justify-between gap-[11px] px-4"
        )}
      >
        <div className={cn("flex items-center gap-[11px]", collapsed && "flex-col gap-2")}>
          <Image
            src="/favicon-512.png"
            alt="Birdsong"
            width={30}
            height={30}
            className="block shrink-0 rounded-control"
          />
          {!collapsed && (
            <span className="font-spectral text-[21px] font-semibold tracking-[-0.01em] text-sidebar-active-foreground">
              Birdsong
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={`${collapsed ? "Expand" : "Collapse"} sidebar (⌘B)`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-sidebar-foreground transition-colors duration-[130ms] ease-in-out hover:bg-sidebar-accent hover:text-sidebar-active-foreground"
        >
          <CollapseIcon collapsed={collapsed} />
        </button>
      </div>

      {!collapsed && (
        <div className="mb-2.5 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsl(0_0%_42%)]">
          Workspace
        </div>
      )}

      <nav className={cn("flex flex-col gap-[3px]", collapsed ? "px-3" : "px-4")}>
        {NAV_ITEMS.map((item) => {
          // "/admin" is a prefix of every other admin route, so it needs an
          // exact-match carve-out to avoid lighting up alongside whichever
          // other item actually matches the current page.
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={collapsed ? item.label : undefined}
              className={cn(
                "group relative flex items-center rounded-control text-[15px] font-medium tracking-[-0.005em] transition-colors duration-[130ms] ease-in-out",
                collapsed ? "h-10 w-10 justify-center" : "gap-[13px] px-3 py-[11px]",
                isActive
                  ? "bg-sidebar-accent text-sidebar-active-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-active-foreground"
              )}
            >
              {isActive && (
                <span
                  className={cn(
                    "absolute inset-y-[9px] w-[3px] rounded-[0_3px_3px_0] bg-indigo-chip",
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

      {/* Workspace plate. Pinned to the rail's bottom (mt-auto), it holds the
          account row, which toggles a small menu with Settings and Sign out
          (outside click and Escape dismiss it) — those two have to live
          somewhere, and the main nav doesn't include them. A "Listening · N
          live" status line sits above it when, and only when, two or more
          surveys are live.

          Collapsed rail: the plate collapses to the bare star button. 64px
          is too narrow for the status line, and a 5px-padded card around a
          lone 36px avatar reads as chrome rather than structure. */}
      <div
        ref={accountRef}
        className={cn("group relative mb-1.5 mt-auto", collapsed ? "px-3" : "px-4")}
      >
        <div
          className={
            collapsed
              ? undefined
              : "rounded-[16px] border border-[rgba(255,253,247,0.09)] bg-[rgba(255,253,247,0.05)] p-[5px] shadow-[0_10px_24px_rgba(0,0,0,0.22)]"
          }
        >
          {/* Only worth a line once there's more than one: at 0 or 1 the
              count tells you nothing you can't see on the surveys page, and
              a permanent "1 live" reads as chrome. It earns its place when
              several are running at once and the number is actually news. */}
          {!collapsed && liveSurveyCount >= 2 && (
            <div className="flex items-center gap-2 px-[11px] pb-[7px] pt-2">
              {/* The ping is a second, absolutely stacked copy of the dot
                  that scales out and fades — the solid dot underneath stays
                  put so the status never reads as flickering. */}
              <span className="relative block h-[7px] w-[7px] shrink-0">
                <span className="ws-ping absolute inset-0 rounded-full bg-[#8fbf7a]" />
                <span className="absolute inset-0 rounded-full bg-[#8fbf7a]" />
              </span>
              <span className="whitespace-nowrap text-[11.5px] font-semibold text-[rgba(243,236,223,0.62)]">
                Listening · {liveSurveyCount} live
              </span>
              <span className="ws-note ml-auto text-[12px] leading-none text-[#e9a674]" aria-hidden>
                ♪
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setAccountOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            aria-label={collapsed ? `Account menu for ${userName ?? "Account"}` : "Account menu"}
            className={cn(
              "ws-user-row flex items-center text-left transition-colors duration-[130ms] ease-in-out",
              collapsed
                ? "h-10 w-10 justify-center rounded-control hover:bg-sidebar-accent"
                : "w-full gap-2.5 rounded-[12px] bg-[rgba(255,253,247,0.04)] p-2 hover:bg-[rgba(255,253,247,0.07)]",
              // While the menu is open the row holds its hover fill, so the
              // plate reads as the thing the popover belongs to.
              accountOpen && (collapsed ? "bg-sidebar-accent" : "bg-[rgba(255,253,247,0.07)]")
            )}
          >
            <StarAvatar />
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-spectral text-[13.5px] font-semibold text-[#f6f0e2]">
                    {userName ?? "Account"}
                  </span>
                  <span className="block whitespace-nowrap text-[11.5px] text-[rgba(243,236,223,0.45)]">
                    Admin
                  </span>
                </span>
                <ChevronIcon />
              </>
            )}
          </button>
        </div>

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
            collapsed ? "bottom-0 left-full ml-2 w-48" : "bottom-full left-2 right-2 mb-1.5",
            accountOpen ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        >
          <Link
            href="/admin/settings"
            role="menuitem"
            onClick={() => setAccountOpen(false)}
            className="block rounded-control px-3 py-3 text-sm text-card-foreground transition-colors hover:bg-secondary"
          >
            Settings
          </Link>
          <SignOutButton className="block w-full rounded-control px-3 py-3 text-left text-card-foreground transition-colors hover:bg-secondary hover:text-card-foreground" />
        </div>
      </div>
    </aside>
  );
}
