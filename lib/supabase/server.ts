import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import type { User } from "@supabase/supabase-js";

// Use in Server Components, Route Handlers, and Server Actions.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore when
            // middleware is refreshing the session.
          }
        },
      },
    }
  );
}

// supabase.auth.getUser() revalidates the session with Supabase's auth
// server (a real network round trip), not just a local JWT decode. The
// admin layout and every admin page independently called it, so a single
// navigation paid for that round trip once per layout/page instead of
// once total. Wrapping it in React's cache() dedupes those calls within
// one request/render pass. Call this instead of supabase.auth.getUser()
// directly from Server Components under app/admin. Middleware's own
// getUser() call is separate (different runtime, also refreshes the
// session cookie) and isn't covered by this cache.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
