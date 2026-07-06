"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./SignOutButton";

const NAV_ITEMS = [
  {
    href: "/admin",
    label: "Surveys",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 9h6M9 13h6M9 17h4" />
      </svg>
    ),
  },
  {
    href: "/admin/surveys/new",
    label: "New Survey",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
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

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="group fixed left-0 top-0 z-40 flex h-screen w-14 flex-col bg-[#111111] transition-all duration-200 ease-out hover:w-56">
      {/* Logo */}
      <div className="flex h-14 items-center overflow-hidden px-4">
        <span className="text-lg font-bold text-white">B</span>
        <span className="ml-2 whitespace-nowrap text-sm font-semibold text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          Birdsong
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-1 flex-col gap-1 px-2 py-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-10 items-center gap-3 overflow-hidden rounded-lg px-2 text-sm transition-colors ${
                isActive
                  ? "bg-white/15 text-white"
                  : "text-[#9ca3af] hover:bg-white/8 hover:text-white"
              }`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">{item.icon}</span>
              <span className="whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: sign out */}
      <div className="flex items-center overflow-hidden border-t border-white/10 px-2 py-3">
        <div className="flex h-10 w-full items-center gap-3 overflow-hidden rounded-lg px-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[#9ca3af]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </span>
          <span className="whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <SignOutButton />
          </span>
        </div>
      </div>
    </aside>
  );
}
