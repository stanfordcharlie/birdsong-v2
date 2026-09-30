"use client";

import { cn } from "@/lib/utils";
import { bg, border, radius, text } from "./tokens";

/**
 * The full-area overlay shown while a file is over the page. Absolute, so the
 * element it sits in is the one that has to be `relative`.
 *
 * Accent ring and accent-weak fill, and it never captures pointer events: the
 * drop is handled by the wrapper underneath, which is still the element the
 * browser is dragging over.
 */
export function FileDropOverlay({ visible, label }: { visible: boolean; label: string }) {
  return (
    <>
      <div
        aria-hidden={!visible}
        className={cn(
          "pointer-events-none absolute inset-0 z-40 flex items-center justify-center border-2 border-dashed transition-opacity",
          radius.card,
          border.accent,
          bg.accentWeak,
          visible ? "opacity-100" : "opacity-0"
        )}
        style={visible ? undefined : { visibility: "hidden" }}
      >
        <p className={cn("ds-body-strong", text.accent)}>{label}</p>
      </div>
      {/* The overlay itself is decoration; this is what a screen reader hears. */}
      <p role="status" aria-live="polite" className="sr-only">
        {visible ? label : ""}
      </p>
    </>
  );
}
