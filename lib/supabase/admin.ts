import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Service-role client for trusted server-side code only (e.g. the interview
// API routes writing responses on behalf of unauthenticated respondents).
// Never import this into client components or expose the key to the browser.
//
// When a read here crosses an RLS boundary on behalf of an unauthenticated
// or differently-scoped caller (e.g. the public survey page reading the
// owner's profile), select the exact columns needed — never select("*").
// This client bypasses every policy, so column narrowing at the call site
// is the only thing standing between "fetch the logo" and "leak the row."
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
