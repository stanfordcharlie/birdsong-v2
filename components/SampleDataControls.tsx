"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// Seeds the demo dataset and lands on the demo survey's detail page, where
// the sample responses are visible. Styling is left to the caller so this
// works on both the dark dashboard panel and light settings cards.
export function AddSampleDataButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/sample-data", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add sample data");
      router.push(`/admin/surveys/${data.survey_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={handleAdd} disabled={loading} className={cn(className)}>
        {loading ? "Adding…" : "Add sample data"}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}

export function RemoveSampleDataButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleRemove() {
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/sample-data", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove sample data");
      setMessage(data.removed > 0 ? "Sample data removed." : "No sample data to remove.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={handleRemove} disabled={loading} className={cn(className)}>
        {loading ? "Removing…" : "Remove sample data"}
      </button>
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
    </span>
  );
}
