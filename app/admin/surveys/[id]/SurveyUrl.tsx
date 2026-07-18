"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export function SurveyUrl({ slug }: { slug: string }) {
  const [url, setUrl] = useState(`/survey/${slug}`);
  const [copied, setCopied] = useState(false);

  // Starts as a relative path so the server- and client-rendered markup
  // match, then upgrades to the full URL once we know the origin.
  useEffect(() => {
    setUrl(`${window.location.origin}/survey/${slug}`);
  }, [slug]);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-2 rounded-control border border-border bg-card py-2 pl-4 pr-2">
      <span className="flex-1 truncate text-sm text-muted-foreground">{url}</span>
      <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
        {copied ? "Copied!" : "Copy"}
      </Button>
    </div>
  );
}
