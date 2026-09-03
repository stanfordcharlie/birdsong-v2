import { getResendClient } from "./resend";

export type OrgInviteEmail = {
  to: string;
  orgName: string;
  inviterName: string;
  role: "admin" | "member";
  acceptUrl: string;
  expiresAt: string;
};

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * The team invite. Same Resend client, sender and shape as the lead alert
 * (lib/email/lead-notification.ts). Throws on a send failure rather than
 * logging and returning: the inviter is watching a form and should be told
 * the email did not go out, unlike the lead alert, which fires in the
 * background after a respondent has already left.
 */
export async function sendOrgInvite(invite: OrgInviteEmail): Promise<void> {
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!fromEmail) {
    throw new Error("RESEND_FROM_EMAIL is not set; cannot send the invite email.");
  }

  const { to, orgName, inviterName, role, acceptUrl, expiresAt } = invite;
  const roleLine = role === "admin" ? "as an admin" : "as a member";
  const expires = new Date(expiresAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject: `${inviterName} invited you to ${orgName} on Birdsong`,
    html: `
      <p>${escapeHtml(inviterName)} invited you to join <strong>${escapeHtml(orgName)}</strong> on Birdsong ${roleLine}.</p>
      <p>Birdsong runs research interviews and turns them into leads. Joining gives you access to this team's studies and responses.</p>
      <p><a href="${escapeHtml(acceptUrl)}">Accept the invite</a></p>
      <p>This link works for the address it was sent to and expires on ${escapeHtml(expires)}. If you were not expecting it, you can ignore this email.</p>
    `,
  });

  if (error) {
    throw new Error(`Invite email failed: ${error.message}`);
  }
}
