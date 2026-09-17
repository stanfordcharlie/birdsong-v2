"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button, PageHeader, PageShell } from "@/components/admin/ui";
import { BirdLoader } from "@/components/BirdLoader";
import { useLoadingGate } from "@/components/useLoadingGate";
import { buildPasteExtractionPrompt } from "@/lib/profile-onboarding/company-profile-fields";

const PROMPT = buildPasteExtractionPrompt();

// Two-part "fill this out with your AI" screen: copy a prompt, paste the
// answer back. Extraction only, never a direct DB write, never navigation
// on its own — the caller (ProfileGate) decides what to do with the result.
export function AiFillFlow({
  onCancel,
  onExtracted,
}: {
  onCancel: () => void;
  onExtracted: (fields: Partial<Record<string, string>>, filledCount: number, totalCount: number) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const showLoader = useLoadingGate(extracting);
  const [error, setError] = useState<string | null>(null);

  async function handleCopy() {
    await navigator.clipboard.writeText(PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleExtract() {
    if (!pastedText.trim() || extracting) return;
    setError(null);
    setExtracting(true);
    try {
      const res = await fetch("/api/profile/ai-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pastedText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extract a profile from that text");
      onExtracted(data.fields, data.filledCount, data.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setExtracting(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Account"
        title="Fill with AI"
        // The one instruction the two steps below cannot carry on their own.
        meta="Copy the prompt into a chat that knows your company, then paste its answer back."
        actions={
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        }
      />

      <div className="admin-measure flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="type-eyebrow">1. Copy the prompt</h2>
            <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
              {copied ? "Copied" : "Copy prompt"}
            </Button>
          </div>
          <pre className="type-code whitespace-pre-wrap rounded-control bg-chip px-4 py-3">{PROMPT}</pre>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="type-eyebrow">2. Paste the answer</h2>
          <Textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste the answer"
            rows={12}
            className="type-code resize-none"
          />
          {error && <p className="type-body-sm text-destructive">{error}</p>}
          <div className="flex justify-end">
            <Button type="button" onClick={handleExtract} disabled={extracting || !pastedText.trim()}>
              {extracting && showLoader && <BirdLoader size={18} label={false} />}
              {extracting ? "Extracting" : "Extract fields"}
            </Button>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
