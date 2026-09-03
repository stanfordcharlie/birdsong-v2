"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/admin/ui";
import { BirdLoader } from "@/components/BirdLoader";
import { useLoadingGate } from "@/components/useLoadingGate";

export function SlackNotificationsForm({ initialUrl }: { initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [saving, setSaving] = useState(false);
  const showSaveLoader = useLoadingGate(saving);
  const [testing, setTesting] = useState(false);
  const showTestLoader = useLoadingGate(testing);
  const [saveState, setSaveState] = useState<{ ok: boolean; message: string } | null>(null);
  const [testState, setTestState] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaveState(null);
    setSaving(true);
    try {
      const res = await fetch("/api/settings/slack-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setSaveState({ ok: true, message: url.trim() ? "Saved." : "Slack notifications off." });
    } catch (err) {
      setSaveState({ ok: false, message: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTestState(null);
    setTesting(true);
    try {
      const res = await fetch("/api/settings/slack-webhook/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send test notification");
      setTestState({ ok: true, message: "Test sent." });
    } catch (err) {
      setTestState({ ok: false, message: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="type-body-sm font-medium">Slack webhook URL</span>
        <Input
          type="url"
          placeholder="https://hooks.slack.com/services/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      {/* The one rule: blank turns notifications off. The guide link is how
          a URL is obtained. */}
      <p className="type-body-sm text-muted-foreground">
        Leave blank to turn notifications off.{" "}
        <a
          href="https://api.slack.com/messaging/webhooks"
          target="_blank"
          rel="noreferrer"
          className="focus-ring rounded-control underline"
        >
          Slack webhooks guide
        </a>
      </p>

      {saveState && (
        <p className={saveState.ok ? "type-body-sm text-muted-foreground" : "type-body-sm text-destructive"}>
          {saveState.message}
        </p>
      )}
      {testState && (
        <p className={testState.ok ? "type-body-sm text-muted-foreground" : "type-body-sm text-destructive"}>
          {testState.message}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" variant="secondary" size="sm" disabled={saving}>
          {saving && showSaveLoader && <BirdLoader size={18} label={false} />}
          {saving ? "Saving" : "Save"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={handleTest} disabled={testing || !url.trim()}>
          {testing && showTestLoader && <BirdLoader size={18} label={false} />}
          {testing ? "Sending" : "Send test"}
        </Button>
      </div>
    </form>
  );
}
