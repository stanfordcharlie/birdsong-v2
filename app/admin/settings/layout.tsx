import { can, getActiveOrg } from "@/lib/org";
import { SettingsChrome, type SettingsNavItem } from "./SettingsChrome";

// The Settings area: one top bar, a left sub-nav, and the section beside it.
//
// An item is listed only when its section has something in it for this
// person. Notifications is the Slack webhook, which only owners and admins
// can change, so a member does not get an empty page to land on.
//
// There is no alert dot on Integrations. A failed HubSpot push is returned to
// the button that asked for it and written to the server log
// (lib/hubspot-sync.ts); nothing stores it, so there is nothing to count.
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const org = await getActiveOrg();

  const items: SettingsNavItem[] = [
    { href: "/admin/settings/profile", label: "Company profile" },
    { href: "/admin/settings/account", label: "Account" },
    ...(can(org?.role, "profile:edit")
      ? [{ href: "/admin/settings/notifications", label: "Notifications" }]
      : []),
    { href: "/admin/settings/integrations", label: "Integrations" },
    { href: "/admin/settings/team", label: "Team" },
  ];

  return <SettingsChrome items={items}>{children}</SettingsChrome>;
}
