import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "./SignupForm";

export default async function AdminSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { invite } = await searchParams;
  // Only ever a path segment: the token is base64url, so anything else is
  // dropped rather than echoed into a redirect.
  const inviteToken = invite && /^[A-Za-z0-9_-]{16,200}$/.test(invite) ? invite : null;

  if (user) {
    redirect(inviteToken ? `/invite/${inviteToken}` : "/");
  }

  return <SignupForm inviteToken={inviteToken} />;
}
