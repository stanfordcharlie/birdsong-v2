"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export type ProfileFormValues = {
  companyName: string;
  whatWeSell: string;
  targetIcp: string;
  valueProp: string;
};

export function ProfileForm({ initialValues }: { initialValues: ProfileFormValues }) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState(initialValues.companyName);
  const [whatWeSell, setWhatWeSell] = useState(initialValues.whatWeSell);
  const [targetIcp, setTargetIcp] = useState(initialValues.targetIcp);
  const [valueProp, setValueProp] = useState(initialValues.valueProp);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
