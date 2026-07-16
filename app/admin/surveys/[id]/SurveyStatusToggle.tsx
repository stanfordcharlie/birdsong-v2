"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function SurveyStatusToggle({ surveyId, status }: { surveyId: string; status: string }) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLive = status === "live";

  async function toggle() {
    setError(null);
    setUpdating(true);
    try {
      const supabase = createClient();
      const { error: dbError } = await supabase
        .from("surveys")
        .update({ status: isLive ? "draft" : "live" })
        .eq("id", surveyId);
      if (dbError) throw dbError;
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={isLive ? "success" : "warning"}>{isLive ? "Live" : "Draft"}</Badge>
      <Button type="button" variant="secondary" size="sm" onClick={toggle} disabled={updating}>
        {updating ? "Updating..." : isLive ? "Set to draft" : "Set to live"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
