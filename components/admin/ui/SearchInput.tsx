"use client";

import { cn } from "@/lib/utils";
import { bg, border, radius, text } from "./tokens";

function SearchIcon() {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="pointer-events-none shrink-0"
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3 3" />
    </svg>
  );
}

/**
 * Icon plus input. The search affordance, identical wherever it appears.
 *
 * `hint` is a keyboard shortcut shown at the right edge in mono (the global
 * search, focused with ⌘K); `inputRef` is what lets the shortcut focus it.
 * `inputProps` passes through the rest of what a combobox needs on the
 * input itself (aria attributes, key handlers). All three are optional and
 * change nothing for the list filters that omit them.
 *
 * The frame is the label, so a click anywhere in it focuses the field, and
 * the focus ring is drawn on the frame rather than on the bare input.
 */
export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  hint,
  inputRef,
  className,
  inputProps,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** aria-label; the visible placeholder is usually too terse on its own. */
  label: string;
  /** A keyboard shortcut, rendered in mono at the right edge. */
  hint?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  className?: string;
  /** Extra attributes for the input element. Never the styling. */
  inputProps?: Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "placeholder" | "className" | "type"
  >;
}) {
  return (
    <label
      className={cn(
        "flex h-[34px] max-w-xs flex-1 basis-56 items-center gap-2 border px-[10px]",
        radius.control,
        border.base,
        bg.base,
        text.muted2,
        "focus-within:ring-2 focus-within:ring-[hsl(var(--ds-focus))] focus-within:ring-offset-2",
        className
      )}
    >
      <SearchIcon />
      <input
        {...inputProps}
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={cn(
          "ds-small min-w-0 flex-1 border-0 bg-transparent outline-none placeholder:text-[color:hsl(var(--ds-muted-3))]",
          text.ink
        )}
      />
      {hint && (
        <kbd aria-hidden className={cn("ds-mono-kbd pointer-events-none shrink-0", text.muted3)}>
          {hint}
        </kbd>
      )}
    </label>
  );
}
