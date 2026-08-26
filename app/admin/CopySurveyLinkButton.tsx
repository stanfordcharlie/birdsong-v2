"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function LinkIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// Copies a live survey's public respondent URL straight from the home page's
// survey list. Same origin-on-mount trick as SurveyUrl: the URL starts as a
// relative path so the server- and client-rendered markup match, then
// upgrades once we know the origin.
export function CopySurveyLinkButton({
  slug,
  title,
  variant = "icon",
  label = "Copy a survey link",
}: {
  slug: string;
  title: string;
  // "icon" is the square button that sits at the end of a survey row.
  // "text" is the masthead's plain action next to the New survey pill, and
  // "button" is the quiet state's bordered one — same copy behaviour and the
  // same copied-confirmation in all three, only the shell differs.
  variant?: "icon" | "text" | "button";
  label?: string;
}) {
  const [url, setUrl] = useState(`/survey/${slug}`);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/survey/${slug}`);
  }, [slug]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  if (variant !== "icon") {
    return (
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? `Link to ${title} copied` : `Copy link to ${title}`}
        className={cn(
          "whitespace-nowrap text-[13px] font-semibold transition-colors",
          variant === "text"
            ? "text-muted-foreground hover:text-card-foreground hover:underline"
            : "rounded-control border border-border bg-card px-4 py-[9px] text-card-foreground hover:border-faint/50 hover:bg-secondary"
        )}
      >
        {copied ? "Copied" : label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? `Link to ${title} copied` : `Copy link to ${title}`}
      title={copied ? "Copied" : "Copy link"}
      // Darkens rather than filling with `secondary`: the row underneath
      // already goes to secondary on hover, so a secondary fill here would be
      // invisible exactly when it's needed.
      className="flex h-9 w-9 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-card-foreground/[0.06] hover:text-card-foreground"
    >
      {copied ? <CheckIcon /> : <LinkIcon />}
    </button>
  );
}
