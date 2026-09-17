"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

// ⌘K / Ctrl+K anywhere in admin. The search field lives on Home, so on any
// other route the shortcut goes there and asks the field to take focus via
// the URL hash (GlobalSearch reads and clears it). On Home it just focuses
// the field, and does nothing if the field already has focus. The sidebar
// owns ⌘B; nothing else in admin claims K.

export const SEARCH_FIELD_ATTR = "data-global-search";
export const SEARCH_FOCUS_HASH = "#search";

export function SearchShortcut() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.key.toLowerCase() !== "k") return;
      e.preventDefault();
      const field = document.querySelector<HTMLInputElement>(`input[${SEARCH_FIELD_ATTR}]`);
      if (field) {
        if (document.activeElement === field) return;
        field.focus();
        field.select();
        return;
      }
      router.push(`/admin${SEARCH_FOCUS_HASH}`);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, pathname]);

  return null;
}
