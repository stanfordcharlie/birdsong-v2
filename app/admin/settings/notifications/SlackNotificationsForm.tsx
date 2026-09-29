"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/admin/ui";
import { dot, text } from "@/components/admin/ui/tokens";
import { BirdLoader } from "@/components/BirdLoader";
import { useLoadingGate } from "@/components/useLoadingGate";
import { cn } from "@/lib/utils";
import { settingsInputClass, settingsLabelClass } from "../SettingsSection";
import { sendSavedSlackTestAction } from "./actions";

// The Slack card. The checkbox is the on/off state; the webhook is what "on"
// means. Turning it off and saving stores a blank URL, which is how the
// route already reads "off", so nothing server-side changes.
//
// The saved webhook never reaches this component. A webhook URL is a
// credential (anyone holding it can post to the channel), so the page passes
// down only whether one is set, and the field below is for typing a new one.
export function SlackNotificationsForm({ webhookSet }: { webhookSet: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useState(webhookSet);
  const [enabled, setEnabled] = useState(webhookSet);
  const [replacing, setReplacing] = useState(false);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const showSaveLoader = useLoadingGate(saving);
  const [testing, setTesting] = useState(false);
  const showTestLoader = useLoadingGate(testing);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const checkboxId = useId();

  // The field shows when there is a URL to type: a first one, or a replacement.
  const entering = enabled && (!saved || replacing);
  // What Save would store: the typed URL when entering one, nothing when off.
  const turningOff = !enabled && saved;
  const dirty = turningOff || (entering && url.trim().length > 0);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    const effectiveUrl = enabled ? url.trim() : "";
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
      setSaved(effectiveUrl.length > 0);
      setReplacing(false);
      setUrl("");
      setStatus({ ok: true, message: effectiveUrl ? "Saved." : "Notifications off." });
      // Integrations reads the same value for its status line.
      router.refresh();
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
      if (entering) {
        // A URL that has been typed but not saved: the existing test route.
        const res = await fetch("/api/settings/slack-webhook/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to send test notification");
      } else {
        const result = await sendSavedSlackTestAction();
        if (!result.ok) throw new Error(result.error || "Failed to send test notification");
      }
      setStatus({ ok: true, message: "Test sent." });
    } catch (err) {
      setStatus({ ok: false, message: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setTesting(false);
    }
  }

  function cancelReplace() {
    setReplacing(false);
    setUrl("");
    setStatus(null);
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <label htmlFor={checkboxId} className="flex cursor-pointer items-center gap-3">
          <input
            id={checkboxId}
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              setEnabled(e.target.checked);
              setStatus(null);
            }}
            className="focus-ring h-4 w-4 accent-[color:hsl(var(--ds-accent))]"
          />
          <span className="text-[14px] font-semibold">Send a message for each qualified lead</span>
        </label>
        {status && (
          <p role="status" className={cn("text-[13px]", status.ok ? text.muted2 : "text-destructive")}>
            {status.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-[3px]">
        <span className={settingsLabelClass}>Webhook</span>
        <span className="flex items-center gap-2 text-[13px] font-semibold">
          <span
            aria-hidden
            className={cn("h-[6px] w-[6px] shrink-0 rounded-full", saved ? dot.accent : dot.muted3)}
          />
          {saved ? "Set" : "Not set"}
        </span>
      </div>

      {entering && (
        <label className="flex flex-col gap-1.5">
          <span className={settingsLabelClass}>{saved ? "New webhook URL" : "Webhook URL"}</span>
          <input
            type="url"
            autoComplete="off"
            placeholder="https://hooks.slack.com/services/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={cn(settingsInputClass, "font-mono text-[13px]")}
          />
        </label>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(entering || turningOff) && (
          <Button type="submit" disabled={saving || !dirty}>
            {saving && showSaveLoader && <BirdLoader size={18} label={false} />}
            {saving ? "Saving" : "Save"}
          </Button>
        )}
        {enabled && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleTest}
            disabled={testing || (entering && !url.trim())}
          >
            {testing && showTestLoader && <BirdLoader size={18} label={false} />}
            {testing ? "Sending" : "Send a test"}
          </Button>
        )}
        {enabled && saved && !replacing && (
          <Button type="button" variant="secondary" onClick={() => setReplacing(true)}>
            Replace webhook
          </Button>
        )}
        {replacing && (
          <Button type="button" variant="ghost" onClick={cancelReplace} disabled={saving}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
