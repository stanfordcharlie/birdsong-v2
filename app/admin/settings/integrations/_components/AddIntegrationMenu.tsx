"use client";

import { Badge, Button } from "@/components/admin/ui";
import { ChevronDown, Menu, MenuHeading, MenuItem } from "./Menu";
import { LogoTile } from "./logos";

/**
 * The "Add integration" dropdown, grouped by type.
 *
 * A connected item is a tag, not a link. Salesforce is listed so the shape
 * of the roadmap is visible, and disabled until it exists. HubSpot has no
 * connect flow yet (its token is set on the server), so its item opens the
 * detail page, which says how it is configured. Slack's flow is the
 * Notifications section, which only owners and admins can open.
 */
export function AddIntegrationMenu({
  hubspotConnected,
  slackConnected,
  canConnectSlack,
}: {
  hubspotConnected: boolean;
  slackConnected: boolean;
  canConnectSlack: boolean;
}) {
  return (
    <Menu
      label="Add integration"
      align="end"
      width={260}
      trigger={({ open, ref, ...props }) => (
        <Button ref={ref} type="button" {...props}>
          Add integration
          <ChevronDown className={open ? "rotate-180 transition-transform" : "transition-transform"} />
        </Button>
      )}
    >
      {(close) => (
        <>
          <MenuHeading>CRM</MenuHeading>
          <MenuItem
            href={hubspotConnected ? undefined : "/admin/settings/integrations/hubspot"}
            disabled={hubspotConnected}
            onSelect={close}
            leading={<LogoTile vendor="hubspot" size={32} />}
            trailing={hubspotConnected ? <Badge variant="accent" size="sm">Connected</Badge> : undefined}
          >
            HubSpot
          </MenuItem>
          <MenuItem
            disabled
            leading={<LogoTile vendor="salesforce" size={32} />}
            trailing={
              <Badge variant="count" size="sm">
                Coming soon
              </Badge>
            }
          >
            Salesforce
          </MenuItem>
          <MenuHeading>Connections</MenuHeading>
          <MenuItem
            href={slackConnected || !canConnectSlack ? undefined : "/admin/settings/notifications"}
            disabled={slackConnected || !canConnectSlack}
            onSelect={close}
            leading={<LogoTile vendor="slack" size={32} />}
            trailing={
              slackConnected ? (
                <Badge variant="accent" size="sm">
                  Connected
                </Badge>
              ) : !canConnectSlack ? (
                <Badge variant="count" size="sm">
                  Admins only
                </Badge>
              ) : undefined
            }
          >
            Slack
          </MenuItem>
        </>
      )}
    </Menu>
  );
}
