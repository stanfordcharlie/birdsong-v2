"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button, Card, PageHeader, PageShell } from "@/components/admin/ui";
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
        eyebrow="Company profile"
        title="Have your AI fill this out"
        subtitle="Copy the prompt below into a ChatGPT or Claude chat that already knows your company, then paste its answer back here. Birdsong fills in whatever it can; anything missing you can fill in yourself."
        actions={
          <Button type="button" variant="secondary" onClick={onCancel}>
            Back to manual setup
          </Button>
        }
      />

      <Card className="mb-5 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="type-section-label">1. Copy this prompt</h2>
          <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
        <pre className="type-code whitespace-pre-wrap rounded-control border border-border bg-chip px-4 py-3.5">
          {PROMPT}
        </pre>
        <p className="type-body text-muted-foreground">
          Paste this into ChatGPT or Claude, then paste its answer below.
        </p>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="type-section-label">2. Paste its answer</h2>
        <Textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder="Paste the full response here..."
          rows={14}
          className="type-code resize-none"
        />
        {error && <p className="type-body text-destructive">{error}</p>}
        <div className="flex justify-end">
          <Button type="button" onClick={handleExtract} disabled={extracting || !pastedText.trim()}>
            {extracting && showLoader && <BirdLoader size={18} label={false} />}
            {extracting ? "Extracting..." : "Extract"}
          </Button>
        </div>
      </Card>
    </PageShell>
  );
}
