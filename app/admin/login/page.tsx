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
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Already signed in — showing the login form again would be pointless
  // (and confusing coming from a stray "Log In" link), so bounce them
  // straight into the app instead.
  if (user) {
    redirect("/");
  }

  const { error } = await searchParams;
  const notice = error ? ERROR_MESSAGES[error] ?? null : null;

  return <LoginForm notice={notice} />;
}
