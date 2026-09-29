"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/admin/ui";
import { bg, border, radius, shadow, text } from "@/components/admin/ui/tokens";
import { cn } from "@/lib/utils";

// The study launcher under the greeting. It is an entry point rather than a
// feature: it navigates to study creation and nothing the visitor types is
// sent anywhere, which is what it did before this was one 56px input.

function SparkleIcon() {
  return (
    <svg
      aria-hidden
      width="18"
      height="18"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", text.accent)}
    >
      <path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M12 4l-2 2M6 10l-2 2" />
    </svg>
  );
}

export function HomeLauncher({ href }: { href: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    router.push(href);
  }

  return (
    <form onSubmit={submit}>
      {/* The frame is the label, so a click anywhere in it focuses the
          field, and the focus ring is drawn on the frame. */}
      <label
        className={cn(
          "flex h-[56px] items-center gap-3 border pl-[18px] pr-2",
          radius.card,
          border.base,
          bg.base,
          shadow.input,
          "focus-within:ring-2 focus-within:ring-[hsl(var(--ds-focus))] focus-within:ring-offset-2"
        )}
      >
        <SparkleIcon />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Describe a new study"
          placeholder="What do you want to learn from your customers?"
          className={cn(
            "min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none placeholder:text-[color:hsl(var(--ds-muted-3))]",
            text.ink
          )}
        />
        <Button type="submit" variant="ink" className="h-[40px] px-4">
          Start a study
        </Button>
      </label>
    </form>
  );
}
