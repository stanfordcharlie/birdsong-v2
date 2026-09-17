"use client";

import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadCompanyLogo, deleteCompanyLogo } from "@/lib/profile/logo";
import type { CompanyProfileEditFields } from "@/lib/profile-onboarding/edit";
import type { Database } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge, Button, PageHeader, PageShell } from "@/components/admin/ui";
import { BirdLoader } from "@/components/BirdLoader";
import { useLoadingGate } from "@/components/useLoadingGate";
import { EMPTY_VALUE } from "@/lib/format";
import { cn } from "@/lib/utils";

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
};

type SectionKey = "basics" | "product" | "audience" | "positioning" | "voice";

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
  return map;
}

function Section({
  title,
  editing,
  onEdit,
  onCancel,
  first,
  readOnly,
  children,
}: {
  title: string;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  first?: boolean;
  readOnly?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("border-border py-5", !first && "border-t")}>
      <div className="mb-3 flex items-center justify-between gap-6">
        <h2 className="type-eyebrow">{title}</h2>
        {readOnly ? null : editing ? (
          <Button type="button" variant="ghost" size="sm" className="px-0" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="sm" className="px-0" onClick={onEdit}>
            Edit
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-0.5 font-archivo text-micro text-muted-foreground">{label}</div>
      <div className="type-body">{value || EMPTY_VALUE}</div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="type-body-sm mb-2 font-semibold">{children}</div>;
}

/** The read view of a free-text section. One measure for all four of them. */
function ReadProse({ value }: { value: string }) {
  return <p className="admin-measure type-body">{value || EMPTY_VALUE}</p>;
}

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

  const [basicsQuickSaveStatus, setBasicsQuickSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [basicsQuickSaveError, setBasicsQuickSaveError] = useState<string | null>(null);

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

  // Explicit save/confirm for the Basics section from the logo row, which
  // renders whether or not "basics" is the section currently being edited.
  // Saves from `draft` while mid-edit (flushing pending field changes), or
  // from `profile` otherwise (nothing pending, still a valid confirm-save).
  async function handleBasicsQuickSave() {
    setBasicsQuickSaveError(null);
    setBasicsQuickSaveStatus("saving");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const source = editingSection === "basics" ? draft : profile;
      const patch: Partial<CompanyProfileValues> = {
        companyName: source.companyName,
        industry: source.industry,
        website: source.website,
        teamSize: source.teamSize,
      };

      const { error } = await supabase.from("profiles").update(fieldsToProfileUpdate(patch)).eq("org_id", orgId);
      if (error) throw error;

      setProfile((prev) => ({ ...prev, ...patch }));
      if (editingSection === "basics") setEditingSection(null);
      setBasicsQuickSaveStatus("saved");
      setTimeout(() => setBasicsQuickSaveStatus("idle"), 2000);
    } catch {
      setBasicsQuickSaveError("Couldn't save, try again");
      setBasicsQuickSaveStatus("idle");
    }
  }

  // Applies straight onto the saved profile (there's no page-wide draft
  // state anymore now that editing is per-section) — the admin sees the
  // change land immediately in whichever section(s) it touched.
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
  const aiButtonLabel = aiStatus === "loading" ? "Sending" : aiStatus === "sent" ? "Applied" : "Send";
  const voiceChips = profile.brandVoice
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <PageShell>
      {/* "Account" because this page has no nav item: it is reached from the
          sidebar's account menu, the same as Settings. */}
      <PageHeader
        className="bs-rise-1"
        eyebrow="Account"
        title="Company profile"
        meta={justFinishedSetup ? "Saved" : undefined}
        actions={
          readOnly ? undefined : (
            <Button type="button" variant="secondary" onClick={onStartAiFill}>
              Fill with AI
            </Button>
          )
        }
      />

      {/* One control: an input and its button. */}
      {!readOnly && (
      <div className="bs-rise-2 mb-2 flex items-center gap-2">
        <input
          type="text"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          onKeyDown={handleAiKeyDown}
          disabled={aiStatus === "loading"}
          placeholder="Edit with AI"
          aria-label="Edit the profile with an AI instruction"
          className="focus-ring h-9 flex-1 rounded-control border border-input bg-card px-3 font-archivo text-sm text-card-foreground placeholder:text-faint disabled:opacity-60"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={handleAiSend}
          disabled={aiStatus === "loading" || !aiPrompt.trim()}
          className="h-9"
        >
          {aiStatus === "loading" && showAiLoader && <BirdLoader size={18} label={false} />}
          {aiButtonLabel}
        </Button>
      </div>
      )}
      {aiError && <p className="type-body-sm mb-2 text-destructive">{aiError}</p>}

      {saveError && <p className="type-body-sm mb-2 text-destructive">{saveError}</p>}

      <div className="flex flex-col">
        {/* Basics + logo: there is nowhere else in the app to change the
            company name, industry, site, team size or logo once onboarding
            is done. */}
        <Section
          title="Basics"
          editing={editingSection === "basics"}
          onEdit={() => startEditing("basics")}
          onCancel={cancelEditing}
          first
          readOnly={readOnly}
        >
          {editingSection === "basics" ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Company name</FieldLabel>
                  <Input value={draft.companyName} onChange={(e) => setField("companyName", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Industry</FieldLabel>
                  <Input value={draft.industry} onChange={(e) => setField("industry", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Website</FieldLabel>
                  <Input value={draft.website} onChange={(e) => setField("website", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Team size</FieldLabel>
                  <Input value={draft.teamSize} onChange={(e) => setField("teamSize", e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  disabled={saving}
                  onClick={() => saveSection(["companyName", "industry", "website", "teamSize"])}
                >
                  {saving && showSaveLoader && <BirdLoader size={18} label={false} />}
                  {saving ? "Saving" : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <ReadField label="Company name" value={profile.companyName} />
              <ReadField label="Industry" value={profile.industry} />
              <ReadField label="Website" value={profile.website} />
              <ReadField label="Team size" value={profile.teamSize} />
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
            {profile.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.logoUrl}
                alt="Company logo"
                className="h-12 w-12 rounded-card border border-border bg-card object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-card border border-border bg-card font-archivo text-sm font-semibold text-card-foreground">
                {initials}
              </div>
            )}
            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoFile} className="hidden" />
            {!readOnly && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => logoInputRef.current?.click()}
              disabled={logoBusy}
            >
              {logoBusy ? "Working" : "Replace logo"}
            </Button>
            )}
            {!readOnly && profile.logoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleLogoRemove}
                disabled={logoBusy}
                className="text-muted-foreground"
              >
                Remove
              </Button>
            )}
            {!readOnly && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleBasicsQuickSave}
              disabled={basicsQuickSaveStatus === "saving"}
            >
              {basicsQuickSaveStatus === "saving"
                ? "Saving"
                : basicsQuickSaveStatus === "saved"
                  ? "Saved"
                  : "Save"}
            </Button>
            )}
          </div>
          {logoError && <p className="type-body-sm mt-2 text-destructive">{logoError}</p>}
          {basicsQuickSaveError && <p className="type-body-sm mt-2 text-destructive">{basicsQuickSaveError}</p>}
        </Section>

        <Section
          title="What you sell"
          editing={editingSection === "product"}
          onEdit={() => startEditing("product")}
          onCancel={cancelEditing}
          readOnly={readOnly}
        >
          {editingSection === "product" ? (
            <div className="flex flex-col gap-3">
              <Textarea rows={3} value={draft.whatWeSell} onChange={(e) => setField("whatWeSell", e.target.value)} />
              <div className="flex justify-end">
                <Button type="button" size="sm" disabled={saving} onClick={() => saveSection(["whatWeSell"])}>
                  {saving && showSaveLoader && <BirdLoader size={18} label={false} />}
                  {saving ? "Saving" : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <ReadProse value={profile.whatWeSell} />
          )}
        </Section>

        <Section
          title="Ideal customer profile"
          editing={editingSection === "audience"}
          onEdit={() => startEditing("audience")}
          onCancel={cancelEditing}
          readOnly={readOnly}
        >
          {editingSection === "audience" ? (
            <div className="flex flex-col gap-3">
              <Textarea rows={5} value={draft.targetIcp} onChange={(e) => setField("targetIcp", e.target.value)} />
              <div className="flex justify-end">
                <Button type="button" size="sm" disabled={saving} onClick={() => saveSection(["targetIcp"])}>
                  {saving && showSaveLoader && <BirdLoader size={18} label={false} />}
                  {saving ? "Saving" : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <ReadProse value={profile.targetIcp} />
          )}
        </Section>

        <Section
          title="Value proposition"
          editing={editingSection === "positioning"}
          onEdit={() => startEditing("positioning")}
          onCancel={cancelEditing}
          readOnly={readOnly}
        >
          {editingSection === "positioning" ? (
            <div className="flex flex-col gap-3">
              <Textarea rows={4} value={draft.valueProp} onChange={(e) => setField("valueProp", e.target.value)} />
              <div className="flex justify-end">
                <Button type="button" size="sm" disabled={saving} onClick={() => saveSection(["valueProp"])}>
                  {saving && showSaveLoader && <BirdLoader size={18} label={false} />}
                  {saving ? "Saving" : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <ReadProse value={profile.valueProp} />
          )}
        </Section>

        <Section
          title="Brand voice"
          editing={editingSection === "voice"}
          onEdit={() => startEditing("voice")}
          onCancel={cancelEditing}
          readOnly={readOnly}
        >
          {editingSection === "voice" ? (
            <div className="flex flex-col gap-3">
              <Input
                value={draft.brandVoice}
                onChange={(e) => setField("brandVoice", e.target.value)}
                placeholder="e.g. Warm, plainspoken, curious"
              />
              <p className="type-body-sm text-muted-foreground">Comma-separated.</p>
              <div className="flex justify-end">
                <Button type="button" size="sm" disabled={saving} onClick={() => saveSection(["brandVoice"])}>
                  {saving && showSaveLoader && <BirdLoader size={18} label={false} />}
                  {saving ? "Saving" : "Save"}
                </Button>
              </div>
            </div>
          ) : voiceChips.length === 0 ? (
            <p className="type-body text-muted-foreground">{EMPTY_VALUE}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {voiceChips.map((chip) => (
                <Badge key={chip} variant="count">
                  {chip}
                </Badge>
              ))}
            </div>
          )}
        </Section>
      </div>

      {!readOnly && (
      <div className="mt-2 flex items-center justify-between border-t border-border pt-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleStartOver}
          disabled={resetting}
          className="text-muted-foreground hover:text-destructive"
        >
          {resetting ? "Resetting" : "Reset profile"}
        </Button>
        {resetError && <span className="type-body-sm text-destructive">{resetError}</span>}
      </div>
      )}
    </PageShell>
  );
}
