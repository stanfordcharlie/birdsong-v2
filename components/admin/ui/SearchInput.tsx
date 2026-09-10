"use client";

import { cn } from "@/lib/utils";

function SearchIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      fill="none"
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
    >
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13.2 13.2L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Icon plus input. The search affordance, identical wherever it appears.
 *
 * `hint` is a keyboard shortcut shown at the right edge (Home's global
 * search, focused with ⌘K); `inputRef` is what lets the shortcut focus it.
 * `inputProps` passes through the rest of what a combobox needs on the
 * input itself (aria attributes, key handlers). All three are optional and
 * change nothing for the list filters that omit them.
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
  /** A keyboard shortcut, rendered as a kbd at the right edge. */
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
    <div className={cn("relative max-w-xs flex-1 basis-56", className)}>
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
          "focus-ring flex h-9 w-full rounded-control border border-input bg-card pl-9",
          hint ? "pr-12" : "pr-3",
          "font-archivo text-sm text-card-foreground placeholder:text-faint"
        )}
      />
      {hint && (
        <kbd
          aria-hidden
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-control border border-border bg-chip px-1.5 py-0.5 font-archivo text-micro text-muted-foreground"
        >
          {hint}
        </kbd>
      )}
    </div>
  );
}
