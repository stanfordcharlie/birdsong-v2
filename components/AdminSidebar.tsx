"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./SignOutButton";
import { cn } from "@/lib/utils";

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
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="shrink-0 text-[hsl(0_0%_42%)]">
      <path d="M5 6l3-3 3 3M5 10l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
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
  userInitial,
}: {
  userName: string | null;
  userInitial: string;
}) {
  const pathname = usePathname();
  // Click-toggled, not hover-revealed: matches the account popover's
  // previous interaction model (works for touch/keyboard, no lost-hover gap
  // to cross).
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

  // Navigating anywhere closes the menu (e.g. after choosing Settings).
  useEffect(() => {
    setAccountOpen(false);
  }, [pathname]);

  return (
    <aside className="sticky top-0 flex h-screen w-[252px] shrink-0 flex-col bg-sidebar pb-3.5 pt-[22px]">
      <div className="mb-[30px] flex items-center gap-[11px] px-3">
        <Image
          src="/favicon-512.png"
          alt="Birdsong"
          width={30}
          height={30}
          className="block rounded-control"
        />
        <span className="font-spectral text-[21px] font-semibold tracking-[-0.01em] text-sidebar-active-foreground">
          Birdsong
        </span>
      </div>

      <div className="mb-2.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsl(0_0%_42%)]">
        Workspace
      </div>

      <nav className="flex flex-col gap-[3px] px-2">
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
              className={cn(
                "relative flex items-center gap-[13px] rounded-control px-3 py-[11px] text-[15px] font-medium tracking-[-0.005em] transition-colors duration-[130ms] ease-in-out",
                isActive
                  ? "bg-sidebar-accent text-sidebar-active-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-active-foreground"
              )}
            >
              {isActive && (
                <span className="absolute inset-y-[9px] left-[-14px] w-[3px] rounded-[0_3px_3px_0] bg-indigo-chip" />
              )}
              <Icon />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* Account chip. Clicking it toggles a small menu with Settings and
          Sign out (outside click and Escape dismiss it). Not shown in the
          static design reference, but Settings/Sign out have to live
          somewhere — the main nav doesn't include them. */}
      <div ref={accountRef} className="relative mb-1.5 px-2">
        <button
          type="button"
          onClick={() => setAccountOpen((prev) => !prev)}
          aria-haspopup="menu"
          aria-expanded={accountOpen}
          aria-label="Account menu"
          className={cn(
            "flex w-full items-center gap-[11px] rounded-control px-2.5 py-[9px] text-left transition-colors duration-[130ms] ease-in-out hover:bg-sidebar-accent",
            accountOpen && "bg-sidebar-accent"
          )}
        >
          <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-indigo-chip text-[13.5px] font-semibold text-white">
            {userInitial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium text-sidebar-active-foreground">
              {userName ?? "Account"}
            </span>
            <span className="block text-[12.5px] text-sidebar-foreground">Admin</span>
          </span>
          <ChevronIcon />
        </button>

        {/* Standard light popover (card surface, border, shadow — the
            design system's menu treatment), toggled by the button above. */}
        <div
          role="menu"
          className={cn(
            "absolute bottom-full left-2 right-2 z-50 mb-1.5 rounded-card border border-border bg-card p-1.5 shadow-lg transition-opacity duration-150",
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
