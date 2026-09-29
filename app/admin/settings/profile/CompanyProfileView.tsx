"use client";

import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadCompanyLogo, deleteCompanyLogo } from "@/lib/profile/logo";
import type { CompanyProfileEditFields } from "@/lib/profile-onboarding/edit";
import type { Database } from "@/types/database";
import { Badge, Button, Card } from "@/components/admin/ui";
import { bg, border, radius, text } from "@/components/admin/ui/tokens";
import { BirdLoader } from "@/components/BirdLoader";
import { useLoadingGate } from "@/components/useLoadingGate";
import { EMPTY_VALUE } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SettingsTopBarExtras } from "../SettingsChrome";
import { SettingsTitle, settingsInputClass, settingsLabelClass } from "../SettingsSection";

export type CompanyProfileValues = {
  companyName: string;
  industry: string;
  website: string;
  teamSize: string;
  logoUrl: string | null;
  whatWeSell: string;
  targetIcp: string;
  valueProp: string;
  brandVoice: string;
  /** profiles.words_to_avoid, set during onboarding. Comma-separated. */
  doNotMention: string;
};

type SectionKey = "basics" | "product" | "audience" | "positioning" | "voice" | "avoid";

function toEditFields(values: CompanyProfileValues): CompanyProfileEditFields {
  return {
    companyName: values.companyName,
    industry: values.industry,
    website: values.website,
    teamSize: values.teamSize,
    whatWeSell: values.whatWeSell,
    targetIcp: values.targetIcp,
    valueProp: values.valueProp,
    brandVoice: values.brandVoice,
  };
}

function fieldsToProfileUpdate(
  fields: Partial<CompanyProfileValues>
): Database["public"]["Tables"]["profiles"]["Update"] {
  const map: Database["public"]["Tables"]["profiles"]["Update"] = {};
  if ("companyName" in fields) map.company_name = fields.companyName || null;
  if ("industry" in fields) map.industry = fields.industry || null;
  if ("website" in fields) map.website = fields.website || null;
  if ("teamSize" in fields) map.team_size = fields.teamSize || null;
  if ("whatWeSell" in fields) map.what_we_sell = fields.whatWeSell || null;
  if ("targetIcp" in fields) map.target_icp = fields.targetIcp || null;
  if ("valueProp" in fields) map.value_prop = fields.valueProp || null;
  if ("brandVoice" in fields) map.tone = fields.brandVoice || null;
  if ("doNotMention" in fields) map.words_to_avoid = fields.doNotMention || null;
  return map;
}

function splitChips(value: string): string[] {
  return value
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function SparkleIcon() {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", text.accent)}
    >
      <path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M12 4l-2 2M6 10l-2 2" />
    </svg>
  );
}

/** A profile card: the 44px header with its Edit link, and the body under it. */
function ProfileCard({
  title,
  editing,
  onEdit,
  onCancel,
  readOnly,
  children,
}: {
  title: string;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  readOnly?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card
      padding="flush"
      header={title}
      headerAction={
        readOnly ? undefined : (
          <button
            type="button"
            onClick={editing ? onCancel : onEdit}
            className={cn("focus-ring", radius.chip)}
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        )
      }
    >
      <div className="px-5 py-[14px]">{children}</div>
    </Card>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-[3px]">
      <span className={cn("text-[12px]", text.muted2)}>{label}</span>
      <span className="break-words text-[14px] font-semibold">{value || EMPTY_VALUE}</span>
    </div>
  );
}

function ReadProse({ value }: { value: string }) {
  return <p className={cn("whitespace-pre-wrap text-[14px] leading-[1.55]", text.ink2)}>{value || EMPTY_VALUE}</p>;
}

function ReadChips({ value }: { value: string }) {
  const chips = splitChips(value);
  if (chips.length === 0) return <p className={cn("text-[14px]", text.muted2)}>{EMPTY_VALUE}</p>;
  return (
    <div className="flex flex-wrap gap-[6px]">
      {chips.map((chip) => (
        <span
          key={chip}
          className={cn("flex h-7 items-center border px-[10px] text-[12px] font-semibold", radius.chip, border.base)}
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className={settingsLabelClass}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={settingsInputClass} />
    </label>
  );
}

const textareaClass = cn(
  "focus-ring w-full resize-y border px-3 py-2 text-[14px] leading-[1.55] placeholder:text-[color:hsl(var(--ds-muted-3))]",
  radius.control,
  border.base,
  bg.base,
  text.ink
);

export function CompanyProfileView({
  orgId,
  readOnly = false,
  initialValues,
  justFinishedSetup,
  onFactoryReset,
  onStartAiFill,
}: {
  // The organization whose profile row this is; every update is keyed by
  // org_id (one profile per org), not by the signed-in user.
  orgId: string;
  // From can(role, "profile:edit"). True renders the read view only: no
  // section edits, no AI controls, no logo controls, no reset.
  readOnly?: boolean;
  initialValues: CompanyProfileValues;
  justFinishedSetup?: boolean;
  onFactoryReset: () => void;
  onStartAiFill: () => void;
}) {
  const [profile, setProfile] = useState(initialValues);
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [draft, setDraft] = useState<CompanyProfileValues>(initialValues);
  const [saving, setSaving] = useState(false);
  const showSaveLoader = useLoadingGate(saving);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const showAiLoader = useLoadingGate(aiStatus === "loading");
  const [aiError, setAiError] = useState<string | null>(null);

  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  function startEditing(section: SectionKey) {
    setSaveError(null);
    setDraft(profile);
    setEditingSection(section);
  }

  function cancelEditing() {
    setEditingSection(null);
    setSaveError(null);
  }

  function setField<K extends keyof CompanyProfileValues>(key: K, value: CompanyProfileValues[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function saveSection(fields: (keyof CompanyProfileValues)[]) {
    setSaveError(null);
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const patch: Partial<CompanyProfileValues> = {};
      for (const key of fields) patch[key] = draft[key] as never;

      const { error } = await supabase.from("profiles").update(fieldsToProfileUpdate(patch)).eq("org_id", orgId);
      if (error) throw error;

      setProfile((prev) => ({ ...prev, ...patch }));
      setEditingSection(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  // Logo persists immediately (it's a storage round trip, not a plain
  // field edit) rather than waiting for a section save.
  async function handleLogoFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);
    setLogoBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const newUrl = await uploadCompanyLogo(user.id, file);
      const previousUrl = profile.logoUrl;

      const { error } = await supabase.from("profiles").update({ logo_url: newUrl }).eq("org_id", orgId);
      if (error) throw error;

      setProfile((prev) => ({ ...prev, logoUrl: newUrl }));
      setDraft((prev) => ({ ...prev, logoUrl: newUrl }));
      if (previousUrl) await deleteCompanyLogo(previousUrl);
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Failed to upload logo");
    } finally {
      setLogoBusy(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function handleLogoRemove() {
    if (!profile.logoUrl) return;
    setLogoError(null);
    setLogoBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const { error } = await supabase.from("profiles").update({ logo_url: null }).eq("org_id", orgId);
      if (error) throw error;

      const previousUrl = profile.logoUrl;
      setProfile((prev) => ({ ...prev, logoUrl: null }));
      setDraft((prev) => ({ ...prev, logoUrl: null }));
      await deleteCompanyLogo(previousUrl);
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Failed to remove logo");
    } finally {
      setLogoBusy(false);
    }
  }

  // Applies straight onto the saved profile (there's no page-wide draft
  // state now that editing is per-section): the admin sees the change land
  // immediately in whichever section(s) it touched.
  async function handleAiSend() {
    if (!aiPrompt.trim() || aiStatus === "loading") return;
    setAiError(null);
    setAiStatus("loading");
    try {
      const res = await fetch("/api/profile/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: aiPrompt, current: toEditFields(profile) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update(fieldsToProfileUpdate(data.updated)).eq("org_id", orgId);
      }

      setProfile((prev) => ({ ...prev, ...data.updated }));
      setAiStatus("sent");
      setTimeout(() => {
        setAiStatus("idle");
        setAiPrompt("");
      }, 1600);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to apply the requested edit");
      setAiStatus("error");
    }
  }

  function handleAiKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAiSend();
    }
  }

  async function handleStartOver() {
    const confirmed = window.confirm(
      "Reset the company profile? Every field and the logo are cleared. This cannot be undone."
    );
    if (!confirmed) return;

    setResetError(null);
    setResetting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const { error } = await supabase
        .from("profiles")
        .update({
          company_name: null,
          what_we_sell: null,
          target_icp: null,
          value_prop: null,
          logo_url: null,
          industry: null,
          team_size: null,
          website: null,
          linkedin: null,
          tone: null,
          words_to_avoid: null,
          contact_name: null,
          contact_email: null,
          onboarding_completed_at: null,
        })
        .eq("org_id", orgId);
      if (error) throw error;

      if (profile.logoUrl) await deleteCompanyLogo(profile.logoUrl);

      onFactoryReset();
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Failed to reset profile");
      setResetting(false);
    }
  }

  const initials = (profile.companyName || "").trim().slice(0, 3).toLowerCase() || "co";
  const aiButtonLabel = aiStatus === "loading" ? "Applying" : aiStatus === "sent" ? "Applied" : "Apply";

  function saveRow(fields: (keyof CompanyProfileValues)[]) {
    return (
      <div className="flex justify-end">
        <Button type="button" size="sm" disabled={saving} onClick={() => saveSection(fields)}>
          {saving && showSaveLoader && <BirdLoader size={18} label={false} />}
          {saving ? "Saving" : "Save"}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      {/* This view only renders for a profile whose setup was finished, which
          is the rule for "complete" (onboarding_completed_at, in the page). */}
      <SettingsTopBarExtras>
        <Badge variant="accent">Complete</Badge>
        {!readOnly && (
          <Button type="button" variant="secondary" onClick={onStartAiFill}>
            Fill with AI
          </Button>
        )}
      </SettingsTopBarExtras>

      <div className="flex min-w-0 flex-col gap-[18px]">
        <SettingsTitle
          title="Company profile"
          description={justFinishedSetup ? "Saved" : "What Birdsong knows about your company."}
        />

        {!readOnly && (
          <label
            className={cn(
              "flex h-[46px] items-center gap-3 border pl-4 pr-2",
              "focus-within:ring-2 focus-within:ring-[hsl(var(--ds-focus))] focus-within:ring-offset-2",
              radius.control,
              border.base,
              bg.base
            )}
          >
            <SparkleIcon />
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={handleAiKeyDown}
              disabled={aiStatus === "loading"}
              placeholder="Edit with AI, for example: we now sell to RevOps too"
              aria-label="Edit with AI"
              className={cn(
                "min-w-0 flex-1 border-0 bg-transparent text-[14px] outline-none placeholder:text-[color:hsl(var(--ds-muted-3))] disabled:opacity-60",
                text.ink
              )}
            />
            <Button
              type="button"
              variant="ink"
              size="sm"
              onClick={handleAiSend}
              disabled={aiStatus === "loading" || !aiPrompt.trim()}
              className="h-[32px] px-[14px] text-[13px]"
            >
              {aiStatus === "loading" && showAiLoader && <BirdLoader size={18} label={false} />}
              {aiButtonLabel}
            </Button>
          </label>
        )}
        {aiError && <p className="text-[13px] text-destructive">{aiError}</p>}
        {saveError && <p className="text-[13px] text-destructive">{saveError}</p>}

        <ProfileCard
          title="Basics"
          editing={editingSection === "basics"}
          onEdit={() => startEditing("basics")}
          onCancel={cancelEditing}
          readOnly={readOnly}
        >
          {editingSection === "basics" ? (
            <div className="flex flex-col gap-3">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <EditField label="Company" value={draft.companyName} onChange={(v) => setField("companyName", v)} />
                <EditField label="Website" value={draft.website} onChange={(v) => setField("website", v)} />
                <EditField label="Industry" value={draft.industry} onChange={(v) => setField("industry", v)} />
                <EditField label="Team size" value={draft.teamSize} onChange={(v) => setField("teamSize", v)} />
              </div>
              {saveRow(["companyName", "industry", "website", "teamSize"])}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ReadField label="Company" value={profile.companyName} />
              <ReadField label="Website" value={profile.website} />
              <ReadField label="Industry" value={profile.industry} />
              <ReadField label="Team size" value={profile.teamSize} />
            </div>
          )}
        </ProfileCard>

        <ProfileCard
          title="What you sell"
          editing={editingSection === "product"}
          onEdit={() => startEditing("product")}
          onCancel={cancelEditing}
          readOnly={readOnly}
        >
          {editingSection === "product" ? (
            <div className="flex flex-col gap-3">
              <textarea
                rows={3}
                aria-label="What you sell"
                value={draft.whatWeSell}
                onChange={(e) => setField("whatWeSell", e.target.value)}
                className={textareaClass}
              />
              {saveRow(["whatWeSell"])}
            </div>
          ) : (
            <ReadProse value={profile.whatWeSell} />
          )}
        </ProfileCard>

        {/* The profile stores the audience as one description, so this card
            is one paragraph rather than the three columns a split field
            would fill. */}
        <ProfileCard
          title="Who you sell to"
          editing={editingSection === "audience"}
          onEdit={() => startEditing("audience")}
          onCancel={cancelEditing}
          readOnly={readOnly}
        >
          {editingSection === "audience" ? (
            <div className="flex flex-col gap-3">
              <textarea
                rows={5}
                aria-label="Who you sell to"
                value={draft.targetIcp}
                onChange={(e) => setField("targetIcp", e.target.value)}
                className={textareaClass}
              />
              {saveRow(["targetIcp"])}
            </div>
          ) : (
            <ReadProse value={profile.targetIcp} />
          )}
        </ProfileCard>

        <ProfileCard
          title="Value proposition"
          editing={editingSection === "positioning"}
          onEdit={() => startEditing("positioning")}
          onCancel={cancelEditing}
          readOnly={readOnly}
        >
          {editingSection === "positioning" ? (
            <div className="flex flex-col gap-3">
              <textarea
                rows={4}
                aria-label="Value proposition"
                value={draft.valueProp}
                onChange={(e) => setField("valueProp", e.target.value)}
                className={textareaClass}
              />
              {saveRow(["valueProp"])}
            </div>
          ) : (
            <ReadProse value={profile.valueProp} />
          )}
        </ProfileCard>

        <ProfileCard
          title="Brand voice"
          editing={editingSection === "voice"}
          onEdit={() => startEditing("voice")}
          onCancel={cancelEditing}
          readOnly={readOnly}
        >
          {editingSection === "voice" ? (
            <div className="flex flex-col gap-3">
              <input
                aria-label="Brand voice"
                value={draft.brandVoice}
                onChange={(e) => setField("brandVoice", e.target.value)}
                placeholder="e.g. Warm, plainspoken, curious"
                className={settingsInputClass}
              />
              <p className={cn("text-[13px]", text.muted2)}>Comma-separated.</p>
              {saveRow(["brandVoice"])}
            </div>
          ) : (
            <ReadChips value={profile.brandVoice} />
          )}
        </ProfileCard>

        <ProfileCard
          title="Do not mention"
          editing={editingSection === "avoid"}
          onEdit={() => startEditing("avoid")}
          onCancel={cancelEditing}
          readOnly={readOnly}
        >
          {editingSection === "avoid" ? (
            <div className="flex flex-col gap-3">
              <input
                aria-label="Do not mention"
                value={draft.doNotMention}
                onChange={(e) => setField("doNotMention", e.target.value)}
                placeholder="e.g. Pricing, competitor names"
                className={settingsInputClass}
              />
              <p className={cn("text-[13px]", text.muted2)}>Comma-separated.</p>
              {saveRow(["doNotMention"])}
            </div>
          ) : (
            <ReadChips value={profile.doNotMention} />
          )}
        </ProfileCard>

        {!readOnly && (
          <div className="flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleStartOver}
              disabled={resetting}
              className="px-0 hover:text-destructive"
            >
              {resetting ? "Resetting" : "Reset profile"}
            </Button>
            {resetError && <span className="text-[13px] text-destructive">{resetError}</span>}
          </div>
        )}
      </div>

      {/* 58px puts the first card level with the Edit with AI bar, under the title. */}
      <div className="flex flex-col gap-4 xl:pt-[58px]">
        <Card padding="flush">
          <div className="flex flex-col gap-3 px-[18px] py-4">
            <div className="flex items-center gap-[14px]">
              {profile.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.logoUrl}
                  alt="Company logo"
                  className={cn("h-12 w-12 shrink-0 border object-cover", radius.control, border.base, bg.base)}
                />
              ) : (
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center text-[13px] font-bold",
                    radius.control,
                    bg.track,
                    text.ink3
                  )}
                >
                  {initials}
                </div>
              )}
              <div className="flex min-w-0 flex-col gap-[2px]">
                <span className="text-[13px] font-bold">Logo</span>
                <span className={cn("text-[12px]", text.muted2)}>Shown to respondents</span>
              </div>
            </div>
            {!readOnly && (
              <div className="flex items-center gap-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFile}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoBusy}
                >
                  {logoBusy ? "Working" : "Replace"}
                </Button>
                {profile.logoUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleLogoRemove} disabled={logoBusy}>
                    Remove
                  </Button>
                )}
              </div>
            )}
            {logoError && <p className="text-[13px] text-destructive">{logoError}</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
