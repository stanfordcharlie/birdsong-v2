"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadCompanyLogo, deleteCompanyLogo } from "@/lib/profile/logo";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export type ProfileFormValues = {
  companyName: string;
  whatWeSell: string;
  targetIcp: string;
  valueProp: string;
  logoUrl: string | null;
};

export function ProfileForm({ initialValues }: { initialValues: ProfileFormValues }) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState(initialValues.companyName);
  const [whatWeSell, setWhatWeSell] = useState(initialValues.whatWeSell);
  const [targetIcp, setTargetIcp] = useState(initialValues.targetIcp);
  const [valueProp, setValueProp] = useState(initialValues.valueProp);
  const [logoUrl, setLogoUrl] = useState(initialValues.logoUrl);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Logo upload/removal saves immediately rather than waiting for the
  // "Save changes" button below: it's an async storage round trip, not a
  // plain field edit, and the admin shouldn't lose an uploaded file by
  // navigating away before touching the rest of the form.
  async function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
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
      const previousUrl = logoUrl;

      const { error: dbError } = await supabase
        .from("profiles")
        .update({ logo_url: newUrl })
        .eq("user_id", user.id);
      if (dbError) throw dbError;

      setLogoUrl(newUrl);
      if (previousUrl) await deleteCompanyLogo(previousUrl);
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Failed to upload logo");
    } finally {
      setLogoBusy(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function handleRemoveLogo() {
    if (!logoUrl) return;
    setLogoError(null);
    setLogoBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const { error: dbError } = await supabase
        .from("profiles")
        .update({ logo_url: null })
        .eq("user_id", user.id);
      if (dbError) throw dbError;

      await deleteCompanyLogo(logoUrl);
      setLogoUrl(null);
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Failed to remove logo");
    } finally {
      setLogoBusy(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const { error: dbError } = await supabase
        .from("profiles")
        .update({
          company_name: companyName || null,
          what_we_sell: whatWeSell || null,
          target_icp: targetIcp || null,
          value_prop: valueProp || null,
        })
        .eq("user_id", user.id);

      if (dbError) throw dbError;

      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-card-foreground">Company name</span>
        <Input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-card-foreground">Company logo</span>
        <span className="text-xs text-muted-foreground">
          Shown on the survey intro when a sponsor is set.
        </span>
        <div className="flex items-center gap-3 pt-1">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Company logo"
              className="h-12 w-12 rounded-control border border-border object-contain"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-control border border-dashed border-border text-xs text-muted-foreground">
              None
            </div>
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => logoInputRef.current?.click()}
            disabled={logoBusy}
          >
            {logoBusy ? "Working..." : logoUrl ? "Replace" : "Upload"}
          </Button>
          {logoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveLogo}
              disabled={logoBusy}
            >
              Remove
            </Button>
          )}
        </div>
        {logoError && <span className="text-xs text-destructive">{logoError}</span>}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-card-foreground">What do you sell?</span>
        <Textarea value={whatWeSell} onChange={(e) => setWhatWeSell(e.target.value)} rows={3} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-card-foreground">Target ICP</span>
        <Textarea
          value={targetIcp}
          onChange={(e) => setTargetIcp(e.target.value)}
          rows={3}
          placeholder="Industry, company size, roles you sell to"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-card-foreground">Value proposition</span>
        <Textarea
          value={valueProp}
          onChange={(e) => setValueProp(e.target.value)}
          rows={3}
          placeholder="Core pitch / what makes you different"
        />
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save changes"}
        </Button>
        {saved && <span className="text-sm text-muted-foreground">Saved.</span>}
      </div>
    </form>
  );
}
