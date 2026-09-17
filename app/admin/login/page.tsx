import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

// Maps the ?error= code the auth callback sets on a failed confirmation into a
// clear, respondent-safe sentence shown above the form.
const ERROR_MESSAGES: Record<string, string> = {
  confirmation:
    "That confirmation link is invalid or has expired. Log in below, or sign up again to get a fresh link.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; invite?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Already signed in — showing the login form again would be pointless
  // (and confusing coming from a stray "Log In" link), so bounce them
  // straight into the app instead.
  const { error, invite } = await searchParams;
  // An invite link sends people here with its token; after login they go
  // back to the accept page. Validated to the token alphabet so it can only
  // ever become a path segment under /invite.
  const inviteToken = invite && /^[A-Za-z0-9_-]{16,200}$/.test(invite) ? invite : null;

  if (user) {
    redirect(inviteToken ? `/invite/${inviteToken}` : "/");
  }

  const notice = error ? ERROR_MESSAGES[error] ?? null : null;

  return <LoginForm notice={notice} inviteToken={inviteToken} />;
}
