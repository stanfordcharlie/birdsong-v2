"use client";

import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadCompanyLogo, deleteCompanyLogo } from "@/lib/profile/logo";
import type { CompanyProfileEditFields } from "@/lib/profile-onboarding/edit";
import type { Database } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

function Section({
  title,
  editing,
  onEdit,
  onCancel,
  first,
  children,
}: {
  title: string;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  first?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("border-border py-6", !first && "border-t")}>
      <div className="mb-4 flex items-baseline justify-between gap-6">
        <h2 className="type-label">{title}</h2>
        {editing ? (
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <Button type="button" variant="secondary" size="sm" onClick={onEdit} className="gap-1.5">
            <EditIcon />
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
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-faint">{label}</div>
      <div className="text-[15px] text-card-foreground">{value || "—"}</div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-sm font-semibold text-card-foreground">{children}</div>;
}

export function CompanyProfileView({
  initialValues,
  justFinishedSetup,
  onFactoryReset,
}: {
  initialValues: CompanyProfileValues;
  justFinishedSetup?: boolean;
  onFactoryReset: () => void;
}) {
  const [profile, setProfile] = useState(initialValues);
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [draft, setDraft] = useState<CompanyProfileValues>(initialValues);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
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

      const { error } = await supabase.from("profiles").update(fieldsToProfileUpdate(patch)).eq("user_id", user.id);
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

      const { error } = await supabase.from("profiles").update({ logo_url: newUrl }).eq("user_id", user.id);
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

      const { error } = await supabase.from("profiles").update({ logo_url: null }).eq("user_id", user.id);
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
        await supabase.from("profiles").update(fieldsToProfileUpdate(data.updated)).eq("user_id", user.id);
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
      "Reset your company profile? This clears everything you've entered, including the logo, and takes you back through setup. This can't be undone."
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
        .eq("user_id", user.id);
      if (error) throw error;

      if (profile.logoUrl) await deleteCompanyLogo(profile.logoUrl);

      onFactoryReset();
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Failed to reset profile");
      setResetting(false);
    }
  }

  const initials = (profile.companyName || "").trim().slice(0, 3).toLowerCase() || "co";
  const aiButtonLabel = aiStatus === "loading" ? "Sending..." : aiStatus === "sent" ? "Applied ✓" : "Send";
  const voiceChips = profile.brandVoice
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="admin-container flex flex-col">
      <div className="bs-rise-1 mb-6">
        <div className="mb-2.5 type-label">Settings</div>
        <h1 className="mb-2.5 type-page-title">Company profile</h1>
        <p className="max-w-[520px] text-[15px] text-muted-foreground">
          What Birdsong knows about your company. Every survey uses this to ask sharper questions and qualify the
          right people.
        </p>
        {justFinishedSetup && (
          <p className="mt-3 text-sm text-muted-foreground">Setup complete, saved. Anything to adjust?</p>
        )}
      </div>

      <div className="bs-rise-2 mb-4 flex items-center gap-2.5 rounded-card border border-border bg-chip px-3.5 py-3">
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className="shrink-0" aria-hidden="true">
          <path d="M8 1.5l1.6 3.9L13.5 7l-3.9 1.6L8 12.5 6.4 8.6 2.5 7l3.9-1.6z" fill="hsl(var(--ds-indigo))" />
        </svg>
        <input
          type="text"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          onKeyDown={handleAiKeyDown}
          disabled={aiStatus === "loading"}
          placeholder='Edit with AI — e.g. "update our value prop to mention the new AI feature"'
          className="flex-1 border-none bg-transparent py-1.5 text-sm text-card-foreground placeholder:text-faint focus:outline-none disabled:opacity-60"
        />
        <Button
          type="button"
          size="sm"
          onClick={handleAiSend}
          disabled={aiStatus === "loading" || !aiPrompt.trim()}
          className="shrink-0 px-4"
        >
          {aiButtonLabel}
        </Button>
      </div>
      {aiError && <p className="-mt-2 mb-4 text-sm text-destructive">{aiError}</p>}

      {saveError && <p className="mb-4 text-sm text-destructive">{saveError}</p>}

      <div className="flex flex-col">
        {/* Basics + logo: not part of the design reference (which only
            covers ICP/voice/defaults), but there's nowhere else in the app
            to change your company name, industry, site, team size, or
            logo once onboarding is done — keeping this section, in the
            same visual language as the rest of the page. */}
        <Section
          title="Basics"
          editing={editingSection === "basics"}
          onEdit={() => startEditing("basics")}
          onCancel={cancelEditing}
          first
        >
          {editingSection === "basics" ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
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
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <ReadField label="Company name" value={profile.companyName} />
              <ReadField label="Industry" value={profile.industry} />
              <ReadField label="Website" value={profile.website} />
              <ReadField label="Team size" value={profile.teamSize} />
            </div>
          )}

          <div className="mt-5 flex items-center gap-3 border-t border-border pt-5">
            {profile.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.logoUrl}
                alt="Company logo"
                className="h-12 w-12 rounded-card border border-border bg-card object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-card border border-border bg-card text-sm font-semibold text-card-foreground">
                {initials}
              </div>
            )}
            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoFile} className="hidden" />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => logoInputRef.current?.click()}
              disabled={logoBusy}
            >
              {logoBusy ? "Working..." : "Replace logo"}
            </Button>
            {profile.logoUrl && (
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
          </div>
          {logoError && <p className="mt-2 text-xs text-destructive">{logoError}</p>}
        </Section>

        <Section
          title="What you sell"
          editing={editingSection === "product"}
          onEdit={() => startEditing("product")}
          onCancel={cancelEditing}
        >
          {editingSection === "product" ? (
            <div className="flex flex-col gap-3">
              <Textarea rows={3} value={draft.whatWeSell} onChange={(e) => setField("whatWeSell", e.target.value)} />
              <div className="flex justify-end">
                <Button type="button" size="sm" disabled={saving} onClick={() => saveSection(["whatWeSell"])}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="max-w-[620px] text-[15px] leading-[1.6] text-card-foreground">
              {profile.whatWeSell || "—"}
            </p>
          )}
        </Section>

        <Section
          title="Ideal customer profile"
          editing={editingSection === "audience"}
          onEdit={() => startEditing("audience")}
          onCancel={cancelEditing}
        >
          {editingSection === "audience" ? (
            <div className="flex flex-col gap-3">
              <Textarea rows={5} value={draft.targetIcp} onChange={(e) => setField("targetIcp", e.target.value)} />
              <div className="flex justify-end">
                <Button type="button" size="sm" disabled={saving} onClick={() => saveSection(["targetIcp"])}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="max-w-[620px] text-[15px] leading-[1.6] text-card-foreground">
              {profile.targetIcp || "—"}
            </p>
          )}
        </Section>

        <Section
          title="Value proposition"
          editing={editingSection === "positioning"}
          onEdit={() => startEditing("positioning")}
          onCancel={cancelEditing}
        >
          {editingSection === "positioning" ? (
            <div className="flex flex-col gap-3">
              <Textarea rows={4} value={draft.valueProp} onChange={(e) => setField("valueProp", e.target.value)} />
              <div className="flex justify-end">
                <Button type="button" size="sm" disabled={saving} onClick={() => saveSection(["valueProp"])}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="max-w-[620px] text-[15px] leading-[1.6] text-card-foreground">
              {profile.valueProp || "—"}
            </p>
          )}
        </Section>

        <Section
          title="Brand voice"
          editing={editingSection === "voice"}
          onEdit={() => startEditing("voice")}
          onCancel={cancelEditing}
        >
          {editingSection === "voice" ? (
            <div className="flex flex-col gap-3">
              <Input
                value={draft.brandVoice}
                onChange={(e) => setField("brandVoice", e.target.value)}
                placeholder="e.g. Warm, plainspoken, curious"
              />
              <p className="text-xs text-muted-foreground">Comma-separated descriptors, in whatever words fit.</p>
              <div className="flex justify-end">
                <Button type="button" size="sm" disabled={saving} onClick={() => saveSection(["brandVoice"])}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : voiceChips.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {voiceChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full bg-indigo-chip/[0.08] px-3 py-1.5 text-[13px] font-medium text-indigo"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
        </Section>
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleStartOver}
          disabled={resetting}
          className="text-muted-foreground hover:text-destructive"
        >
          {resetting ? "Resetting..." : "Start over"}
        </Button>
        {resetError && <span className="text-xs text-destructive">{resetError}</span>}
      </div>
    </div>
  );
}
