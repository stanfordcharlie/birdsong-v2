"use client";

import { forwardRef, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { bg, border, radius, shadow, text } from "@/components/admin/ui/tokens";
import { cn } from "@/lib/utils";

/**
 * A small dropdown: a trigger, and a panel that opens under it.
 *
 * The panel is portaled to the admin root (the element carrying
 * `.admin-theme`) rather than rendered in place, so it escapes a table's
 * overflow container and the row link's stacking context while still
 * reading the admin tokens. It is positioned from the trigger's rect on
 * open, and closes on Escape, on an outside click, or when an item is
 * chosen.
 */
export function Menu({
  trigger,
  label,
  align = "end",
  width = 240,
  children,
}: {
  /** Renders the trigger. Receives the state and the props to spread on it. */
  trigger: (props: {
    open: boolean;
    ref: React.RefObject<HTMLButtonElement>;
    "aria-haspopup": "menu";
    "aria-expanded": boolean;
    "aria-controls": string;
    onClick: () => void;
  }) => React.ReactNode;
  /** Names the menu for screen readers. */
  label: string;
  align?: "start" | "end";
  width?: number;
  children: (close: () => void) => React.ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setHost(triggerRef.current?.closest<HTMLElement>(".admin-theme") ?? document.body);
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const left = align === "end" ? rect.right - width : rect.left;
    setPosition({
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(left, window.innerWidth - width - 8)),
    });
  }, [open, align, width]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onScroll() {
      setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      {trigger({
        open,
        ref: triggerRef,
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": id,
        onClick: () => setOpen((previous) => !previous),
      })}
      {open &&
        host &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            id={id}
            role="menu"
            aria-label={label}
            style={{ top: position.top, left: position.left, width }}
            className={cn(
              "fixed z-50 flex flex-col border p-[6px]",
              radius.control,
              border.base,
              bg.base,
              shadow.float
            )}
          >
            {children(close)}
          </div>,
          host
        )}
    </>
  );
}

/** A small uppercase heading over a group of items. */
export function MenuHeading({ children }: { children: React.ReactNode }) {
  return (
    <div role="presentation" className={cn("ds-eyebrow px-[10px] pb-[4px] pt-[8px]", text.muted3)}>
      {children}
    </div>
  );
}

const ITEM =
  "focus-ring flex h-[36px] w-full items-center gap-[10px] px-[10px] text-left text-[13px] font-semibold transition-colors";

/**
 * One row of a menu. A link when `href` is given, a button otherwise, and
 * an inert row when `disabled`. `trailing` is a tag at the right edge
 * ("Connected", "Coming soon").
 */
export function MenuItem({
  href,
  onSelect,
  disabled,
  leading,
  trailing,
  children,
}: {
  href?: string;
  onSelect?: () => void;
  disabled?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  const classes = cn(
    ITEM,
    radius.chip,
    disabled
      ? cn("cursor-default", text.muted2)
      : cn(text.ink, "hover:bg-[color:hsl(var(--ds-bg-sidebar))]")
  );
  const body = (
    <>
      {leading}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing}
    </>
  );
  if (disabled) {
    return (
      <div role="menuitem" aria-disabled="true" className={classes}>
        {body}
      </div>
    );
  }
  if (href) {
    return (
      <Link href={href} role="menuitem" onClick={onSelect} className={classes}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" role="menuitem" onClick={onSelect} className={classes}>
      {body}
    </button>
  );
}

/** The 30px square kebab trigger for a table row. */
export const KebabButton = forwardRef<
  HTMLButtonElement,
  {
    open: boolean;
    label: string;
    className?: string;
    "aria-haspopup": "menu";
    "aria-expanded": boolean;
    "aria-controls": string;
    onClick: () => void;
  }
>(function KebabButton({ open, label, className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        "focus-ring flex h-[30px] w-[30px] items-center justify-center transition-colors",
        radius.chip,
        open
          ? cn(bg.track, text.ink)
          : cn(text.muted2, "hover:bg-[color:hsl(var(--ds-bg-track))] hover:text-[color:hsl(var(--ds-ink))]"),
        className
      )}
      {...props}
    >
      <svg aria-hidden viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <circle cx="5" cy="12" r="1.8" />
        <circle cx="12" cy="12" r="1.8" />
        <circle cx="19" cy="12" r="1.8" />
      </svg>
    </button>
  );
});

export function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
