"use client";

import { useId, useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/admin/ui";
import { BirdLoader } from "@/components/BirdLoader";
import { useLoadingGate } from "@/components/useLoadingGate";
import { cn } from "@/lib/utils";

// The Slack card. The switch is the on/off state; the URL is what "on"
// means. Turning it off and saving stores a blank URL, which is how the
// route already reads "off", so nothing server-side changes.
export function SlackNotificationsForm({ initialUrl }: { initialUrl: string | null }) {
  const savedUrl = initialUrl ?? "";
  const [enabled, setEnabled] = useState(savedUrl.trim().length > 0);
  const [url, setUrl] = useState(savedUrl);
  const [lastSaved, setLastSaved] = useState(savedUrl);
  const [saving, setSaving] = useState(false);
  const showSaveLoader = useLoadingGate(saving);
  const [testing, setTesting] = useState(false);
  const showTestLoader = useLoadingGate(testing);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const switchId = useId();

  // What Save would store: the URL when on, nothing when off.
  const effectiveUrl = enabled ? url.trim() : "";
  const dirty = effectiveUrl !== lastSaved.trim();

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    setSaving(true);
    try {
      const res = await fetch("/api/settings/slack-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: effectiveUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setLastSaved(effectiveUrl);
      setStatus({ ok: true, message: effectiveUrl ? "Saved." : "Notifications off." });
    } catch (err) {
      setStatus({ ok: false, message: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setStatus(null);
    setTesting(true);
    try {
      const res = await fetch("/api/settings/slack-webhook/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send test notification");
      setStatus({ ok: true, message: "Test sent." });
    } catch (err) {
      setStatus({ ok: false, message: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            id={switchId}
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled((v) => !v)}
            className={cn(
              "focus-ring relative h-6 w-11 shrink-0 rounded-pill transition-colors",
              enabled ? "bg-primary" : "bg-border"
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-pill bg-card shadow-sm transition-[left]",
                enabled ? "left-[22px]" : "left-0.5"
              )}
            />
          </button>
          <label htmlFor={switchId} className="type-body font-medium">
            {enabled ? "On" : "Off"}
          </label>
        </div>
        {status && (
          <p className={cn("type-body-sm", status.ok ? "text-muted-foreground" : "text-destructive")}>
            {status.message}
          </p>
        )}
      </div>

      {enabled && (
        <label className="flex flex-col gap-1.5">
          <span className="type-body-sm font-medium">Webhook URL</span>
          <Input
            type="url"
            placeholder="https://hooks.slack.com/services/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="type-code h-10"
          />
        </label>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={saving || !dirty}>
          {saving && showSaveLoader && <BirdLoader size={18} label={false} />}
          {saving ? "Saving" : "Save"}
        </Button>
        {enabled && (
          <Button type="button" variant="secondary" onClick={handleTest} disabled={testing || !url.trim()}>
            {testing && showTestLoader && <BirdLoader size={18} label={false} />}
            {testing ? "Sending" : "Send test"}
          </Button>
        )}
      </div>
    </form>
  );
}
