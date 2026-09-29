"use client";

import { createContext, useContext, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { PageTopBar, adminButtonVariants } from "@/components/admin/ui";
import { bg, border, radius, text } from "@/components/admin/ui/tokens";
import { cn } from "@/lib/utils";

export type SettingsNavItem = { href: string; label: string };

/**
 * Where a section's own top bar controls land: to the left of Sign out. Null
 * until the bar has mounted.
 */
const TopBarExtrasContext = createContext<HTMLElement | null>(null);

/**
 * A section's additions to the Settings top bar (the profile's Complete badge
 * and Fill with AI). Draws nothing in place.
 */
export function SettingsTopBarExtras({ children }: { children: React.ReactNode }) {
  const slot = useContext(TopBarExtrasContext);
  if (!slot) return null;
  return createPortal(children, slot);
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The Settings frame.
 *
 * The negative margins cancel AdminShell's content padding so the sub-nav's
 * border runs the full height under the top bar; the section gets the same
 * padding back on its own side.
 *
 * A section can ask for the whole width by rendering an element marked
 * `data-settings-bare`: the sub-nav steps aside and the section is left with
 * exactly the box AdminShell would have given it. The profile setup flow
 * needs that, because it draws a full-bleed rail of its own.
 */
export function SettingsChrome({
  items,
  children,
}: {
  items: SettingsNavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const [extrasSlot, setExtrasSlot] = useState<HTMLElement | null>(null);
  const current = items.find((item) => isActive(pathname, item.href));

  return (
    <TopBarExtrasContext.Provider value={extrasSlot}>
      <PageTopBar
        crumbs={[{ label: "Settings" }, ...(current ? [{ label: current.label }] : [])]}
        actions={
          <>
            <span ref={setExtrasSlot} className="contents" />
            <SignOutButton className={cn(adminButtonVariants({ variant: "secondary" }))} />
          </>
        }
      />

      <div className="group -mx-8 -my-7 flex min-h-[calc(100vh_-_var(--ds-shell-topbar))]">
        <nav
          aria-label="Settings"
          className={cn(
            "sticky top-[var(--ds-shell-topbar)] flex h-[calc(100vh_-_var(--ds-shell-topbar))] w-[220px] shrink-0 flex-col gap-[2px] self-start border-r px-[14px] py-6",
            "group-has-[[data-settings-bare]]:hidden",
            border.base
          )}
        >
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-ring flex h-[34px] shrink-0 items-center px-[10px] text-[13px]",
                  radius.chip,
                  active
                    ? cn(bg.track, text.ink, "font-bold")
                    : cn(text.muted, "font-semibold hover:text-[color:hsl(var(--ds-ink))]")
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1 px-8 py-7">{children}</div>
      </div>
    </TopBarExtrasContext.Provider>
  );
}
