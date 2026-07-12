"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./SignOutButton";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5 12 3l9 6.5" />
        <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
      </svg>
    ),
  },
  {
    href: "/admin/surveys",
    label: "Surveys",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 9h6M9 13h6M9 17h4" />
      </svg>
    ),
  },
  {
    href: "/admin/profile",
    label: "Company Profile",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

function SidebarToggleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

// Flyout label for the icon-only rail, anchored to the right edge of
// whichever icon it's wrapped around (a tight `group/tooltip relative`
// wrapper, not the full row, so it lines up with the icon itself).
function IconTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-[#111111] px-2 py-1 text-xs font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover/tooltip:opacity-100">
      {label}
    </span>
  );
}

export function AdminSidebar({
  expanded,
  onToggle,
  userEmail,
}: {
  expanded: boolean;
  onToggle: () => void;
  userEmail: string | null;
}) {
  const pathname = usePathname();
  const initial = (userEmail?.trim()?.[0] ?? "?").toUpperCase();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col bg-[#111111] transition-all duration-200 ease-out",
        expanded ? "w-56" : "w-14"
      )}
    >
      {/* Header: logo + wordmark + toggle inline when expanded, just the
          toggle when collapsed (mirrors Jack & Jill's sidebar header). */}
      <div className="flex h-14 items-center px-4">
        {expanded ? (
          <>
            <Link href="/admin" className="flex flex-1 items-center gap-2 overflow-hidden">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/birdsong_logo_mark_v2.svg" alt="Birdsong" width={32} height={32} className="h-6 w-6" />
              </span>
              <span className="whitespace-nowrap text-sm font-semibold text-white">Birdsong</span>
            </Link>
            <button
              type="button"
              onClick={onToggle}
              aria-label="Collapse sidebar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#9ca3af] transition-colors hover:bg-white/10 hover:text-white"
            >
              <SidebarToggleIcon />
            </button>
          </>
        ) : (
          <div className="group/tooltip relative mx-auto flex">
            <button
              type="button"
              onClick={onToggle}
              aria-label="Expand sidebar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#9ca3af] transition-colors hover:bg-white/10 hover:text-white"
            >
              <SidebarToggleIcon />
            </button>
            <IconTooltip label="Expand sidebar" />
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex flex-1 flex-col gap-1 px-2 py-3">
        {NAV_ITEMS.map((item) => {
          // "/admin" is a prefix of every other admin route, so it needs an
          // exact-match carve-out to avoid lighting up alongside whichever
          // other item actually matches the current page.
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <div key={item.href} className="group/tooltip relative flex w-full">
              <Link
                href={item.href}
                className={`flex h-10 w-full items-center gap-3 overflow-hidden rounded-lg px-2 text-sm transition-colors ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-[#9ca3af] hover:bg-white/8 hover:text-white"
                }`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">{item.icon}</span>
                <span
                  className={cn(
                    "whitespace-nowrap transition-opacity duration-150",
                    expanded ? "opacity-100" : "opacity-0"
                  )}
                >
                  {item.label}
                </span>
              </Link>
              {!expanded && <IconTooltip label={item.label} />}
            </div>
          );
        })}
      </nav>

      {/* Bottom: account avatar (first initial of the user's email) + sign out */}
      <div className="flex items-center border-t border-white/10 px-2 py-3">
        <div className="group/tooltip relative flex w-full">
          <div className="flex h-10 w-full items-center gap-3 overflow-hidden rounded-lg px-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initial}
            </span>
            <span
              className={cn(
                "whitespace-nowrap transition-opacity duration-150",
                expanded ? "opacity-100" : "opacity-0"
              )}
            >
              <SignOutButton />
            </span>
          </div>
          {!expanded && <IconTooltip label="Sign out" />}
        </div>
      </div>
    </aside>
  );
}
