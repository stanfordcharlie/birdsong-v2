"use client";

import { useEffect } from "react";
import { AdminSidebar } from "./AdminSidebar";

export function AdminShell({
  children,
  userName,
  userInitial,
}: {
  children: React.ReactNode;
  userName: string | null;
  userInitial: string;
}) {
  // The browser paints overscroll/rubber-band regions with <body>'s actual
  // background-color, which is still the legacy --background white (see
  // globals.css) — so scrolling past the top/bottom of an admin page flashed
  // white instead of the page token. Only override it while an admin page is
  // mounted, so the respondent interview and marketing pages (which still
  // rely on that legacy body background) are untouched.
  useEffect(() => {
    document.body.style.backgroundColor = "hsl(var(--ds-page-background))";
    // The rubber-band bounce paints the body background beyond the layout's
    // edges — above/below the dark sidebar that reads as the rail ending in
    // dead white space. One body background can't match both the ink rail
    // and the light content column, so disable the bounce entirely on admin
    // routes instead: the page simply stops at its edges. Set on <html>,
    // the actual document scroller.
    document.documentElement.style.overscrollBehaviorY = "none";
    return () => {
      document.body.style.backgroundColor = "";
      document.documentElement.style.overscrollBehaviorY = "";
    };
  }, []);

  return (
    <div className="font-archivo flex min-h-screen bg-page text-card-foreground">
      <AdminSidebar userName={userName} userInitial={userInitial} />
      {/* AdminSidebar is a normal (sticky, not fixed) flex sibling, so it
          always reserves exactly its own current width — no padding value
          here needs to track the sidebar's collapsed/expanded state. */}
      <main className="min-w-0 flex-1">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
