"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  PageHeader,
  PageShell,
  RelativeTime,
  type Column,
} from "@/components/admin/ui";
import { EMPTY_VALUE } from "@/lib/format";
import type { OrgRole } from "@/lib/org-permissions";
import type { PendingInvite, TeamMember } from "@/lib/org-team";
import {
  changeRoleAction,
  inviteMemberAction,
  removeMemberAction,
  renameOrgAction,
  resendInviteAction,
  revokeInviteAction,
  type ActionResult,
} from "./actions";

type Permissions = {
  invite: boolean;
  remove: boolean;
  changeRole: boolean;
  rename: boolean;
};

const ROLE_LABEL: Record<OrgRole, string> = { owner: "Owner", admin: "Admin", member: "Member" };

// Same native control styling the lead queue and the status control use.
const INPUT_CLASSES =
  "focus-ring flex h-9 rounded-control border border-input bg-card px-3 font-archivo text-sm text-card-foreground placeholder:text-faint disabled:opacity-60";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border py-5 first:border-t-0 first:pt-0">
      <h2 className="type-eyebrow mb-3">{title}</h2>
      {children}
    </section>
  );
}

function RoleBadge({ role }: { role: OrgRole }) {
  return <Badge variant={role === "member" ? "count" : "outline"} size="sm">{ROLE_LABEL[role]}</Badge>;
}

// --- Team name ---------------------------------------------------------------

function OrgNameRow({ name, canRename }: { name: string; canRename: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await renameOrgAction(draft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-5">
        <div className="flex flex-col gap-0.5">
          <span className="font-archivo text-micro text-muted-foreground">Team name</span>
          <span className="type-body">{name || EMPTY_VALUE}</span>
        </div>
        {canRename && (
          <Button type="button" variant="ghost" size="sm" className="px-0" onClick={() => { setDraft(name); setEditing(true); }}>
            Edit
          </Button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Team name"
          maxLength={80}
          autoFocus
          disabled={pending}
          className={`${INPUT_CLASSES} w-72`}
        />
        <Button type="submit" size="sm" disabled={pending || !draft.trim()}>
          {pending ? "Saving" : "Save"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
      {error && <p className="type-body-sm text-destructive">{error}</p>}
    </form>
  );
}

// --- Members -----------------------------------------------------------------

function MemberActions({
  member,
  role,
  currentUserId,
  permissions,
  onResult,
}: {
  member: TeamMember;
  role: OrgRole;
  currentUserId: string;
  permissions: Permissions;
  onResult: (result: ActionResult) => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const isSelf = member.userId === currentUserId;

  // What the server will accept, mirrored so the row only offers what will
  // succeed. The server actions re-check every one of these.
  const isOwner = role === "owner";
  const canChangeThisRole = permissions.changeRole && isOwner && member.role !== "owner" && !isSelf;
  const canRemoveThis =
    member.role !== "owner" &&
    (isSelf || (permissions.remove && (isOwner || member.role === "member")));

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await action();
      onResult(result);
      if (result.ok) router.refresh();
      setConfirming(false);
    });
  }

  if (!canChangeThisRole && !canRemoveThis) return null;

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2 whitespace-nowrap">
        <span className="type-body-sm text-muted-foreground">
          {isSelf ? "Leave this team?" : "Remove from team?"}
        </span>
        <Button type="button" size="sm" disabled={pending} onClick={() => run(() => removeMemberAction(member.userId))}>
          {pending ? "Removing" : "Confirm"}
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      {canChangeThisRole && (
        <select
          value={member.role}
          disabled={pending}
          aria-label={`Change role for ${member.name ?? member.email ?? "member"}`}
          onChange={(e) => run(() => changeRoleAction(member.userId, e.target.value))}
          className={INPUT_CLASSES}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner (transfer)</option>
        </select>
      )}
      {canRemoveThis && (
        <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setConfirming(true)}>
          {isSelf ? "Leave team" : "Remove"}
        </Button>
      )}
    </span>
  );
}

// --- Invites -----------------------------------------------------------------

function InviteActions({
  invite,
  onResult,
}: {
  invite: PendingInvite;
  onResult: (result: ActionResult) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await action();
      onResult(result);
      if (result.ok) router.refresh();
    });
  }

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => run(() => resendInviteAction(invite.id))}>
        Resend
      </Button>
      <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => run(() => revokeInviteAction(invite.id))}>
        Revoke
      </Button>
    </span>
  );
}

function InviteForm({ onResult }: { onResult: (result: ActionResult) => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await inviteMemberAction(email, role);
      onResult(result);
      if (result.ok) {
        setEmail("");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="teammate@company.com"
        aria-label="Email address to invite"
        required
        disabled={pending}
        className={`${INPUT_CLASSES} w-72`}
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value === "admin" ? "admin" : "member")}
        aria-label="Role for the invited teammate"
        disabled={pending}
        className={INPUT_CLASSES}
      >
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </select>
      <Button type="submit" size="sm" disabled={pending || !email.trim()}>
        {pending ? "Sending" : "Send invite"}
      </Button>
    </form>
  );
}

// --- Page --------------------------------------------------------------------

export function TeamView({
  orgName,
  role,
  currentUserId,
  members,
  invites,
  permissions,
}: {
  orgName: string;
  role: OrgRole;
  currentUserId: string;
  members: TeamMember[];
  invites: PendingInvite[];
  permissions: Permissions;
}) {
  // One notice line for the whole page: the last action's outcome.
  const [notice, setNotice] = useState<{ kind: "error" | "ok"; text: string } | null>(null);

  function handleResult(result: ActionResult, okText = "Done.") {
    setNotice(result.ok ? { kind: "ok", text: okText } : { kind: "error", text: result.error });
  }

  const showMemberActions = members.some(
    (m) => m.role !== "owner" && (m.userId === currentUserId || permissions.remove || permissions.changeRole)
  );

  const memberColumns: Column<TeamMember>[] = [
    {
      key: "who",
      header: "Member",
      width: 0.4,
      truncate: true,
      title: (m) => m.email ?? undefined,
      cell: (m) => (
        <span className="flex flex-col">
          <span className="font-medium">{m.name ?? m.email ?? EMPTY_VALUE}</span>
          {m.name && m.email && <span className="text-micro text-muted-foreground">{m.email}</span>}
        </span>
      ),
    },
    { key: "role", header: "Role", width: "sm", cell: (m) => <RoleBadge role={m.role} /> },
    {
      key: "joined",
      header: "Joined",
      width: "md",
      cell: (m) => <RelativeTime date={m.joinedAt} className="text-muted-foreground" />,
    },
    ...(showMemberActions
      ? [
          {
            key: "actions",
            header: <span className="sr-only">Actions</span>,
            align: "right" as const,
            cell: (m: TeamMember) => (
              <MemberActions
                member={m}
                role={role}
                currentUserId={currentUserId}
                permissions={permissions}
                onResult={(r) => handleResult(r, "Team updated.")}
              />
            ),
          },
        ]
      : []),
  ];

  const inviteColumns: Column<PendingInvite>[] = [
    {
      key: "email",
      header: "Email",
      width: 0.34,
      truncate: true,
      title: (i) => i.email,
      cell: (i) => <span className="font-medium">{i.email}</span>,
    },
    { key: "role", header: "Role", width: "sm", cell: (i) => <RoleBadge role={i.role} /> },
    {
      key: "by",
      header: "Invited by",
      width: 0.2,
      truncate: true,
      cell: (i) => <span className="text-muted-foreground">{i.invitedByName ?? EMPTY_VALUE}</span>,
    },
    {
      key: "expires",
      header: "Expires",
      width: "md",
      cell: (i) =>
        i.expired ? (
          <Badge variant="warning" size="sm">Expired</Badge>
        ) : (
          <span className="text-muted-foreground" title={new Date(i.expiresAt).toLocaleString()}>
            {Math.max(1, Math.ceil((new Date(i.expiresAt).getTime() - Date.now()) / 86_400_000))}d
          </span>
        ),
    },
    ...(permissions.invite
      ? [
          {
            key: "actions",
            header: <span className="sr-only">Actions</span>,
            align: "right" as const,
            width: "lg" as const,
            cell: (i: PendingInvite) => (
              <InviteActions invite={i} onResult={(r) => handleResult(r, "Invite updated.")} />
            ),
          },
        ]
      : []),
  ];

  return (
    <PageShell>
      <PageHeader eyebrow="Account" title="Team" meta={`${members.length} ${members.length === 1 ? "member" : "members"}`} />

      {notice && (
        <p className={`type-body-sm mb-4 ${notice.kind === "error" ? "text-destructive" : "text-muted-foreground"}`} role="status">
          {notice.text}
        </p>
      )}

      <div className="flex flex-col">
        <Section title="Team name">
          <OrgNameRow name={orgName} canRename={permissions.rename} />
        </Section>

        <Section title="Members">
          <DataTable
            columns={memberColumns}
            rows={members}
            rowKey={(m) => m.userId}
            layout="fixed"
            empty={{ title: "No members yet." }}
          />
        </Section>

        {invites.length > 0 && (
          <Section title="Pending invites">
            <DataTable
              columns={inviteColumns}
              rows={invites}
              rowKey={(i) => i.id}
              layout="fixed"
              density="compact"
              empty={{ title: "No pending invites." }}
            />
          </Section>
        )}

        {permissions.invite && (
          <Section title="Invite a teammate">
            <Card padding="compact">
              <InviteForm onResult={(r) => handleResult(r, "Invite sent.")} />
              <p className="type-body-sm mt-2 text-muted-foreground">
                Admins can create and edit studies. Members work the lead queue and read everything else.
              </p>
            </Card>
          </Section>
        )}

        {!permissions.invite && members.length > 0 && (
          <Section title="Your access">
            <EmptyState title="You can view the team. An owner or admin manages invites and roles." />
          </Section>
        )}
      </div>
    </PageShell>
  );
}
