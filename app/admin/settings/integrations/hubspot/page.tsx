import { createClient } from "@/lib/supabase/server";
import { excludeDeletedResponses } from "@/lib/responses/visibility";
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
      // Deleted responses drop out of these two figures as they drop out of
      // every other count, so the page agrees with Leads. The deal or contact
      // they pushed is still in HubSpot: nothing here removes it, and the
      // delete dialog says as much.
      excludeDeletedResponses(
        supabase
          .from("responses")
          .select("id", { count: "exact", head: true })
          .not("hubspot_synced_at", "is", null)
      ),
      excludeDeletedResponses(
        supabase
          .from("responses")
          .select("hubspot_synced_at")
          .not("hubspot_synced_at", "is", null)
      )
        .order("hubspot_synced_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);
    pushedCount = count ?? 0;
    firstPushedAt = first?.hubspot_synced_at ?? null;
  }

  return <HubSpotView tab={tab} connected={connected} pushedCount={pushedCount} firstPushedAt={firstPushedAt} />;
}
