import { getResendClient } from "./resend";
import type { Database } from "@/types/database";

type Survey = Database["public"]["Tables"]["surveys"]["Row"];

export type LeadNotification = {
  survey: Pick<Survey, "id" | "title">;
  respondentName: string | null;
  respondentEmail: string | null;
  leadScore: number;
  painPoints: string[];
  ownerEmail: string;
};

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendLeadNotification(notification: LeadNotification): Promise<void> {
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!fromEmail) {
    console.error("RESEND_FROM_EMAIL is not set; skipping lead notification email");
    return;
  }

  const { survey, respondentName, respondentEmail, leadScore, painPoints, ownerEmail } =
    notification;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const adminLink = `${appUrl}/admin/surveys/${survey.id}`;

  const painPointsHtml = painPoints.length
    ? `<ul>${painPoints.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>`
    : "<p>None extracted.</p>";

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: fromEmail,
    to: ownerEmail,
    subject: `New response: ${survey.title} (lead score ${leadScore}/10)`,
    html: `
      <p>A new interview just wrapped up for <strong>${escapeHtml(survey.title)}</strong>.</p>
      <ul>
        <li><strong>Name:</strong> ${escapeHtml(respondentName || "Not provided")}</li>
        <li><strong>Email:</strong> ${escapeHtml(respondentEmail || "Not provided")}</li>
        <li><strong>Lead score:</strong> ${leadScore}/10</li>
      </ul>
      <p><strong>Pain points:</strong></p>
      ${painPointsHtml}
      <p><a href="${adminLink}">View the full response in admin</a></p>
    `,
  });

  if (error) {
    console.error("Failed to send lead notification email", error);
  }
}
