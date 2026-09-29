import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";
import { getHubSpotClientFromEnv } from "@/lib/hubspot-sync";
import { HubSpotView, type Tab } from "./HubSpotView";

export default async function HubSpotIntegrationPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [org, params] = await Promise.all([getActiveOrg(), searchParams]);
  const tab: Tab = params.tab === "mapping" ? "mapping" : "overview";
  const connected = getHubSpotClientFromEnv() !== null;

  // What this org has pushed, from the sync's own bookkeeping on responses.
  // The cookie client's read policy scopes both queries to the org.
  let pushedCount = 0;
  let firstPushedAt: string | null = null;
  if (org) {
    const supabase = await createClient();
    const [{ count }, { data: first }] = await Promise.all([
      supabase
        .from("responses")
        .select("id", { count: "exact", head: true })
        .not("hubspot_synced_at", "is", null),
      supabase
        .from("responses")
        .select("hubspot_synced_at")
        .not("hubspot_synced_at", "is", null)
        .order("hubspot_synced_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);
    pushedCount = count ?? 0;
    firstPushedAt = first?.hubspot_synced_at ?? null;
  }

  return <HubSpotView tab={tab} connected={connected} pushedCount={pushedCount} firstPushedAt={firstPushedAt} />;
}
