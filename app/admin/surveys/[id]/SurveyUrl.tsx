"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
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
    <div className="flex items-center gap-2">
      <Input
        type="text"
        readOnly
        value={url}
        onFocus={(e) => e.target.select()}
        className="flex-1 font-mono text-sm"
      />
      <Button type="button" variant="secondary" onClick={handleCopy}>
        {copied ? "Copied!" : "Copy"}
      </Button>
    </div>
  );
}
