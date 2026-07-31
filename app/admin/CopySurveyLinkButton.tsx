"use client";

import { useEffect, useState } from "react";

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
export function CopySurveyLinkButton({ slug, title }: { slug: string; title: string }) {
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
