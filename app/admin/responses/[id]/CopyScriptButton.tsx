"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyScriptButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context); there's
      // nothing more useful to do than leave the button unchanged.
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      onClick={handleCopy}
      className="bg-[#111111] text-white hover:bg-[#111111]/90"
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
