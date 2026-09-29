"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/admin/ui";
import { bg, border, radius, shadow, text } from "@/components/admin/ui/tokens";
import { LAUNCHER_SEED_KEY } from "@/lib/study-brief/types";
import { cn } from "@/lib/utils";

const NEW_STUDY_PATH = "/admin/projects/new";

// The study launcher under the greeting. It is an entry point rather than a
// feature: it navigates to study creation and sends nothing itself. What was
// typed is left in sessionStorage for the new study page, which makes it the
// first message of the conversation.

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
    const typed = value.trim();
    // Only when this leads to study creation: a member's launcher goes to
    // Projects, where nothing would read it.
    if (typed && href.startsWith(NEW_STUDY_PATH)) {
      try {
        window.sessionStorage.setItem(LAUNCHER_SEED_KEY, typed);
      } catch {
        // Storage is unavailable. The page opens on its own first question.
      }
    }
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
