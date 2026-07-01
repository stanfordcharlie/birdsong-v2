"use client";

import { useState, useEffect } from "react";

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
      <input
        type="text"
        readOnly
        value={url}
        onFocus={(e) => e.target.select()}
        className="flex-1 rounded border bg-white px-3 py-2 font-mono text-sm text-neutral-900"
      />
      <button
        type="button"
        onClick={handleCopy}
        className="rounded border px-3 py-2 text-sm text-neutral-900"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
