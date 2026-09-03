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

/** Icon plus input. The search affordance, identical wherever it appears. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** aria-label; the visible placeholder is usually too terse on its own. */
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("relative max-w-xs flex-1 basis-56", className)}>
      <SearchIcon />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={cn(
          "focus-ring flex h-9 w-full rounded-control border border-input bg-card pl-9 pr-3",
          "font-archivo text-sm text-card-foreground placeholder:text-faint"
        )}
      />
    </div>
  );
}
