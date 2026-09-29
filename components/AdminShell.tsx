"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar, type SidebarData } from "./AdminSidebar";
import { TopBarContent, TopBarSlotContext, type Crumb } from "@/components/admin/ui";
import { manrope, plexMono } from "@/lib/fonts";
import { cn } from "@/lib/utils";

// The scope every Ledger II token lives under (app/globals.css).
const THEME_CLASS = "admin-theme";

// The breadcrumb a page gets without asking for one, from its route alone.
// A page with a name of its own (a study, a lead) replaces it with
// <PageTopBar>; until it does, the section it belongs to is what shows.
const SECTIONS: { prefix: string; crumbs: Crumb[] }[] = [
  { prefix: "/admin/projects/new", crumbs: [{ label: "Projects", href: "/admin/projects" }, { label: "New study" }] },
  { prefix: "/admin/projects", crumbs: [{ label: "Projects" }] },
  { prefix: "/admin/leads", crumbs: [{ label: "Leads" }] },
  { prefix: "/admin/responses", crumbs: [{ label: "Leads", href: "/admin/leads" }, { label: "Lead" }] },
  { prefix: "/admin/live", crumbs: [{ label: "Live" }] },
  // The Settings layout draws these itself once it mounts; they are here so
  // the bar reads the same in the frame before it does.
  { prefix: "/admin/settings/profile", crumbs: [{ label: "Settings" }, { label: "Company profile" }] },
  { prefix: "/admin/settings/account", crumbs: [{ label: "Settings" }, { label: "Account" }] },
  { prefix: "/admin/settings/notifications", crumbs: [{ label: "Settings" }, { label: "Notifications" }] },
  { prefix: "/admin/settings/integrations", crumbs: [{ label: "Settings" }, { label: "Integrations" }] },
  { prefix: "/admin/settings/team", crumbs: [{ label: "Settings" }, { label: "Team" }] },
  { prefix: "/admin/settings", crumbs: [{ label: "Settings" }] },
  { prefix: "/admin/styleguide", crumbs: [{ label: "Styleguide" }] },
];

function defaultCrumbs(pathname: string): Crumb[] {
  const match = SECTIONS.find(
    (section) => pathname === section.prefix || pathname.startsWith(`${section.prefix}/`)
  );
  if (!match) return [{ label: "Home" }];
  // Deeper than the section itself: the section becomes a parent that links
  // back, and the page's own name is the page's to supply.
  if (pathname !== match.prefix && match.crumbs.length === 1) {
    return [{ ...match.crumbs[0], href: match.prefix }];
  }
  return match.crumbs;
}

export function AdminShell({
  children,
  userName,
  workspaceName,
  sidebar,
}: {
  children: React.ReactNode;
  userName: string | null;
  workspaceName: string | null;
  sidebar: SidebarData;
}) {
  const pathname = usePathname() ?? "/admin";
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  // Two things the root element below cannot reach. Dialogs and menus are
  // portalled to <body>, outside this tree, so the token scope is put on
  // <body> too while an admin page is mounted. And the rubber-band bounce
  // paints <body>'s own background past the layout's edges, which would show
  // the legacy page colour beside the sidebar, so the bounce is turned off on
  // <html>, the actual document scroller. Both are undone on unmount so the
  // respondent study and the marketing pages never see either.
  useEffect(() => {
    document.body.classList.add(THEME_CLASS, manrope.variable, plexMono.variable);
    document.body.style.backgroundColor = "hsl(var(--ds-bg))";
    document.documentElement.style.overscrollBehaviorY = "none";
    return () => {
      document.body.classList.remove(THEME_CLASS, manrope.variable, plexMono.variable);
      document.body.style.backgroundColor = "";
      document.documentElement.style.overscrollBehaviorY = "";
    };
  }, []);

  return (
    <div
      className={cn(
        THEME_CLASS,
        manrope.variable,
        plexMono.variable,
        "flex min-h-screen bg-[color:hsl(var(--ds-bg))]"
      )}
    >
      <AdminSidebar userName={userName} workspaceName={workspaceName} data={sidebar} />
      <main className="flex min-w-0 flex-1 flex-col">
        {/* The top bar. A page's <PageTopBar> portals into the first child;
            while that is empty the route's own breadcrumb shows instead. */}
        <div className="sticky top-0 z-30 flex h-[56px] shrink-0 items-center border-b border-[color:hsl(var(--ds-border))] bg-[color:hsl(var(--ds-bg))] px-8">
          <div ref={setSlot} className="peer flex h-full min-w-0 flex-1 items-center empty:hidden" />
          <div className="hidden h-full min-w-0 flex-1 items-center peer-empty:flex">
            <TopBarContent crumbs={defaultCrumbs(pathname)} />
          </div>
        </div>
        <TopBarSlotContext.Provider value={slot}>
          <div className="px-8 py-7">{children}</div>
        </TopBarSlotContext.Provider>
      </main>
    </div>
  );
}
