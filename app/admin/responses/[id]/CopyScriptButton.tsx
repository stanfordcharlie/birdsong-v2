"use client";

import { useEffect, useRef, useState } from "react";
import { Button, type AdminButtonProps } from "@/components/admin/ui";

// The opening line card's Copy button, and the only copy control on the
// page. Imports the admin Button per DESIGN.md's import boundary, since this
// renders only inside /admin.
export function CopyScriptButton({
  text,
  label = "Copy",
  variant,
  size = "sm",
  className,
}: {
  text: string;
  label?: string;
  variant?: AdminButtonProps["variant"];
  size?: AdminButtonProps["size"];
  className?: string;
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
    <Button type="button" variant={variant} size={size} onClick={handleCopy} className={className}>
      {copied ? "Copied" : label}
    </Button>
  );
}
