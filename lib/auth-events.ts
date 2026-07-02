import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Best-effort: a missed login-event row should never block the actual
// sign-in flow, so failures are swallowed rather than thrown.
export async function logLoginEvent(
  supabase: SupabaseClient<Database>,
  userId: string,
  email: string | null
): Promise<void> {
  try {
    await supabase.from("auth_events").insert({
      user_id: userId,
      email,
      event_type: "login",
    });
  } catch {
    // Signup is logged server-side via a DB trigger regardless.
  }
}
