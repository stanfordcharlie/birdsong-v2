"use client";

import { useEffect, useRef, useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

// Two of these sit on the response detail page (the header's primary action
// and the call-script card's own quieter one), copying the same text. They
// hold their own "Copied" state rather than sharing one, so the label
// confirms the button you actually pressed.
export function CopyScriptButton({
  text,
  label = "Copy",
  variant,
  size = "sm",
}: {
  text: string;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context); there's
      // nothing more useful to do than leave the button unchanged.
    }
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={handleCopy}>
      {copied ? "Copied" : label}
    </Button>
  );
}
