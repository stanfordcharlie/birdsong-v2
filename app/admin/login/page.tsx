import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export default async function AdminLoginPage() {
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

  return <LoginForm />;
}
