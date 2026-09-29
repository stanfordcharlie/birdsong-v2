import Link from "next/link";
import { Button, DataTable, EmptyState, type Column } from "@/components/admin/ui";
import { text } from "@/components/admin/ui/tokens";
import { cn } from "@/lib/utils";
import { SettingsTitle } from "../SettingsSection";
import { AddIntegrationMenu } from "./_components/AddIntegrationMenu";
import { LogoTile, type IntegrationVendor } from "./_components/logos";
import { RowMenu } from "./_components/RowMenu";
import { StatusPill, type ConnectionStatus } from "./_components/StatusPill";

type IntegrationRow = {
  vendor: IntegrationVendor;
  name: string;
  /** The stored connection identifier. Never a token or a full webhook URL. */
  connectionId: string | null;
  status: ConnectionStatus;
  detailsHref: string;
  disconnect: { kind: "slack-webhook" } | null;
};

// Integration, Connection ID, Status, the row menu.
const GRID_TEMPLATE = "minmax(0,1.5fr) minmax(0,1fr) 128px 40px";

const columns: Column<IntegrationRow>[] = [
  {
    key: "integration",
    header: "Integration",
    rowLabel: true,
    cell: (row) => (
      <span className="flex min-w-0 items-center gap-[12px]">
        <LogoTile vendor={row.vendor} size={32} />
        <span className={cn("ds-row-primary truncate", text.ink)}>{row.name}</span>
      </span>
    ),
  },
  {
    key: "connectionId",
    header: "Connection ID",
    cell: (row) =>
      row.connectionId ? (
        <span className={cn("ds-mono-count", text.ink3)}>{row.connectionId}</span>
      ) : (
        <span className={text.muted3}>Not stored</span>
      ),
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <StatusPill status={row.status} />,
  },
  {
    key: "menu",
    header: <span className="sr-only">Actions</span>,
    align: "right",
    cell: (row) => <RowMenu name={row.name} detailsHref={row.detailsHref} disconnect={row.disconnect} />,
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className={cn("ds-eyebrow", text.muted3)}>{title}</h2>
      {children}
    </section>
  );
}

export type IntegrationsViewProps = {
  hubspotConnected: boolean;
  slackConnected: boolean;
  slackStatus: ConnectionStatus;
  /** The Slack workspace id parsed from the webhook. Never the URL. */
  slackWorkspaceId: string | null;
  canEdit: boolean;
};

/**
 * The Integrations section, given its facts. The page reads them; this
 * only lays them out, so it can be rendered with fixtures.
 */
export function IntegrationsView({
  hubspotConnected,
  slackConnected,
  slackStatus,
  slackWorkspaceId,
  canEdit,
}: IntegrationsViewProps) {
  const crmRows: IntegrationRow[] = hubspotConnected
    ? [
        {
          vendor: "hubspot",
          name: "HubSpot",
          connectionId: null,
          status: "connected",
          detailsHref: "/admin/settings/integrations/hubspot",
          disconnect: null,
        },
      ]
    : [];

  const connectionRows: IntegrationRow[] = slackConnected
    ? [
        {
          vendor: "slack",
          name: "Slack",
          connectionId: slackWorkspaceId,
          status: slackStatus,
          detailsHref: "/admin/settings/notifications",
          disconnect: canEdit ? { kind: "slack-webhook" } : null,
        },
      ]
    : [];

  return (
    <div className="flex max-w-[900px] flex-col gap-[22px]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <SettingsTitle title="Integrations" description="Where leads go and how the team hears about them." />
        <AddIntegrationMenu
          hubspotConnected={hubspotConnected}
          slackConnected={slackConnected}
          canConnectSlack={canEdit}
        />
      </div>

      <Section title="CRM">
        <DataTable
          columns={columns}
          rows={crmRows}
          rowKey={(row) => row.vendor}
          rowHref={(row) => row.detailsHref}
          gridTemplate={GRID_TEMPLATE}
          stickyHeader={false}
          empty={{
            title: "No CRM connected. Leads stay in Birdsong until one is.",
            action: (
              <Button asChild size="sm" variant="secondary">
                <Link href="/admin/settings/integrations/hubspot">Set up HubSpot</Link>
              </Button>
            ),
          }}
        />
      </Section>

      <Section title="Connections">
        {connectionRows.length > 0 ? (
          <DataTable
            columns={columns}
            rows={connectionRows}
            rowKey={(row) => row.vendor}
            rowHref={(row) => row.detailsHref}
            gridTemplate={GRID_TEMPLATE}
            stickyHeader={false}
            empty={{ title: "No connections yet." }}
          />
        ) : (
          <EmptyState
            title="No connections yet. Slack posts a message when a lead completes an interview."
            action={
              canEdit ? (
                <Button asChild size="sm" variant="secondary">
                  <Link href="/admin/settings/notifications">Connect Slack</Link>
                </Button>
              ) : undefined
            }
          />
        )}
      </Section>
    </div>
  );
}
