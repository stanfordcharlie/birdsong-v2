"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

// Minimal modal shell (no Radix dependency in this codebase yet). Portalled
// to document.body so it's never clipped by an ancestor's overflow-hidden
// (e.g. the surveys table's Card) and always sits above everything else.
// Dismisses on Escape or backdrop click; callers own their own submit
// buttons/footer via children.
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-[#241f18]/40 backdrop-blur-[1px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bs-dialog-title"
        className={cn(
          "relative w-full max-w-[420px] rounded-card border border-border bg-card p-6 shadow-lg"
        )}
      >
        <h2 id="bs-dialog-title" className="text-base font-semibold text-card-foreground">
          {title}
        </h2>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
