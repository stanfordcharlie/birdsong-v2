import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { can, getActiveOrg } from "@/lib/org";
import { getHubSpotClientFromEnv } from "@/lib/hubspot-sync";
import { BIRDSONG_CONTACT_PROPERTIES, BIRDSONG_PIPELINE_LABEL } from "@/lib/hubspot";
import { Button, Card } from "@/components/admin/ui";
import { border, dot, radius, text } from "@/components/admin/ui/tokens";
import { cn } from "@/lib/utils";
import { SettingsSection } from "../SettingsSection";

// The vendor's brand colour behind a letter, until the official marks are
// added to public/logos. These two literals are the only colours in admin
// that are not tokens, and a logo is never drawn by hand.
const TILES = {
  hubspot: { letter: "H", ground: "bg-[#FF7A59]" },
  slack: { letter: "S", ground: "bg-[#4A154B]" },
} as const;

function LogoTile({ vendor }: { vendor: keyof typeof TILES }) {
  const tile = TILES[vendor];
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center text-[13px] font-extrabold text-white",
        radius.control,
        tile.ground
      )}
    >
      {tile.letter}
    </span>
  );
}

function IntegrationHeader({
  vendor,
  name,
  connected,
  action,
}: {
  vendor: keyof typeof TILES;
  name: string;
  connected: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-[14px] px-5 py-[18px]">
      <LogoTile vendor={vendor} />
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="text-[14px] font-bold">{name}</span>
        <span className={cn("flex items-center gap-2 text-[12px]", text.muted2)}>
          <span
            aria-hidden
            className={cn("h-[6px] w-[6px] shrink-0 rounded-full", connected ? dot.accent : dot.muted3)}
          />
          {connected ? "Connected" : "Not connected"}
        </span>
      </div>
      {action}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-[3px]">
      <span className={cn("text-[12px]", text.muted2)}>{label}</span>
      <span className="text-[13px] font-semibold leading-[1.45]">{value}</span>
    </div>
  );
}

// The contact properties the sync writes, from the list it provisions them
// from, under the names this page uses. A property added there without a
// name here shows its HubSpot label rather than going missing.
const FIELD_NAMES: Record<string, string> = {
  birdsong_lead_score: "Lead score",
  birdsong_survey: "Study",
  birdsong_pain_points: "Pain points",
  birdsong_response_url: "Response link",
  birdsong_interview_date: "Interview date",
  birdsong_call_script: "Call script",
};
const FIELDS_SYNCED = BIRDSONG_CONTACT_PROPERTIES.map(
  (property) => FIELD_NAMES[property.name] ?? property.label
).join(", ");

export default async function IntegrationSettingsPage() {
  const org = await getActiveOrg();
  const canEdit = can(org?.role, "profile:edit");

  // Whether a token is configured, never the token.
  const hubspotConnected = getHubSpotClientFromEnv() !== null;

  let slackConnected = false;
  if (org) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("slack_webhook_url")
      .eq("org_id", org.orgId)
      .maybeSingle();
    slackConnected = Boolean(data?.slack_webhook_url?.trim());
  }

  return (
    <SettingsSection title="Integrations" description="Where leads go and how you hear about them.">
      <Card padding="flush">
        <IntegrationHeader vendor="hubspot" name="HubSpot" connected={hubspotConnected} />
        {hubspotConnected && (
          <div className={cn("grid gap-4 border-t px-5 py-[14px] sm:grid-cols-3", border.base)}>
            <Detail label="Pipeline" value={BIRDSONG_PIPELINE_LABEL} />
            <Detail label="Push" value="When an interview completes, or from each lead" />
            <Detail label="Fields synced" value={FIELDS_SYNCED} />
          </div>
        )}
      </Card>

      <Card padding="flush">
        <IntegrationHeader
          vendor="slack"
          name="Slack"
          connected={slackConnected}
          action={
            canEdit ? (
              <Button asChild variant="secondary" size="sm">
                <Link href="/admin/settings/notifications">Manage</Link>
              </Button>
            ) : undefined
          }
        />
      </Card>
    </SettingsSection>
  );
}
