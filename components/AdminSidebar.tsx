"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./SignOutButton";
import { cn } from "@/lib/utils";

const COLLAPSE_STORAGE_KEY = "bs-sidebar-collapsed";

function ToggleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="10" y1="4" x2="10" y2="20" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function SurveysIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  );
}

function CompanyProfileIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <line x1="8" y1="7" x2="8" y2="7.01" />
      <line x1="12" y1="7" x2="12" y2="7.01" />
      <line x1="16" y1="7" x2="16" y2="7.01" />
      <line x1="8" y1="11" x2="8" y2="11.01" />
      <line x1="12" y1="11" x2="12" y2="11.01" />
      <line x1="16" y1="11" x2="16" y2="11.01" />
      <path d="M9 21v-4h6v4" />
    </svg>
  );
}

// Nav icon set (house/clipboard/building) — apply the same icons to any new
// admin nav items going forward, for consistency.
const NAV_ITEMS = [
  { href: "/admin", label: "Home", icon: HomeIcon },
  { href: "/admin/surveys", label: "Surveys", icon: SurveysIcon },
  { href: "/admin/profile", label: "Company profile", icon: CompanyProfileIcon },
];

export function AdminSidebar({
  userName,
  userInitial,
}: {
  userName: string | null;
  userInitial: string;
}) {
  const pathname = usePathname();
  // Starts expanded on both server and first client render (no
  // localStorage access during SSR) to avoid a hydration mismatch, then
  // syncs to the stored preference right after mount — a possible one-frame
  // flash from expanded to collapsed on reload, traded deliberately for
  // zero hydration-mismatch risk (same tradeoff as the admin home greeting).
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      } catch {
        // Private browsing / storage disabled — the preference just won't persist.
      }
      return next;
    });
  }

  return (
    <aside
      className={cn(
        // sticky, not fixed: a plain flex sibling of <main> (see
        // AdminShell), so its rendered width is always what main's layout
        // actually reserves — no separate padding value to keep in sync as
        // the width transitions between collapsed/expanded.
        "sticky top-0 flex h-screen shrink-0 flex-col justify-between bg-sidebar pb-8 pt-10 transition-[width] duration-200 ease-out",
        collapsed ? "w-16" : "w-[196px]"
      )}
    >
      {/* overflow-hidden lives here, not on <aside> itself — narrow enough
          to clip the wordmark/labels cleanly during the width transition,
          but not so broad that it also clips the account menu below, which
          needs to overflow past the rail's edge to be readable. Horizontal
          padding is a constant 12px (px-3) on every row here and in the
          account chip below, rather than on the outer <aside> — the
          previous version put 28px on <aside> *and* 12px on each nav item,
          and at 196px wide that compounded enough to clip "Company
          profile"'s label. */}
      <div className="overflow-hidden">
        <div className={cn("mb-12 flex items-center px-3", collapsed ? "justify-center" : "gap-2.5")}>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control bg-sidebar-accent/[0.06] text-sidebar-foreground transition-colors hover:bg-sidebar-accent/[0.12]"
          >
            <ToggleIcon />
          </button>
          {!collapsed && (
            <Link href="/admin" className="whitespace-nowrap font-serif text-[19px] text-sidebar-foreground">
              Birdsong
            </Link>
          )}
        </div>

        <nav className={cn("flex flex-col gap-1", !collapsed && "px-2")}>
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
                title={item.label}
                className={cn(
                  "flex items-center whitespace-nowrap rounded-control text-[13px] transition-colors",
                  collapsed ? "mx-auto h-10 w-10 justify-center" : "gap-2 px-2.5 py-[9px]",
                  isActive
                    ? "bg-sidebar-accent font-semibold text-sidebar-active-foreground"
                    : "font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent/[0.06] hover:text-sidebar-foreground"
                )}
              >
                <Icon />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom: account chip. Hovering it reveals a small menu with
          Settings and Sign out, flush against the chip (no margin gap) so
          moving the cursor up into the menu doesn't cross a dead zone and
          prematurely end the hover. Not shown in the static design
          reference, but Settings/Sign out have to live somewhere — the
          main nav only ever listed Home/Surveys/Company profile. */}
      <div className={cn("group/account relative flex items-center px-3", collapsed ? "justify-center" : "gap-2.5")}>
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-indigo-light text-[13px] font-semibold text-sidebar-active-foreground">
          {userInitial}
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-sidebar-foreground">
              {userName ?? "Account"}
            </div>
            <div className="text-[11px] text-sidebar-foreground/50">Admin</div>
          </div>
        )}

        <div className="pointer-events-none absolute bottom-full left-0 z-50 w-48 rounded-control border border-sidebar-border/[0.12] bg-sidebar p-1 opacity-0 shadow-lg transition-opacity duration-150 group-hover/account:pointer-events-auto group-hover/account:opacity-100">
          <Link
            href="/admin/settings"
            className="block rounded-control px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/[0.06] hover:text-sidebar-foreground"
          >
            Settings
          </Link>
          <div className="rounded-control px-3 py-2 transition-colors hover:bg-sidebar-accent/[0.06]">
            <SignOutButton className="text-sidebar-foreground/60 hover:text-sidebar-foreground" />
          </div>
        </div>
      </div>
    </aside>
  );
}
