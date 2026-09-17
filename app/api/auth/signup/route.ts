import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPersonalOrg } from "@/lib/org";
import { getInviteByToken, inviteIsRedeemable } from "@/lib/org-team";
import { logLoginEvent } from "@/lib/auth-events";

// POST /api/auth/signup
// Body: { email, password, firstName, lastName }
//
// The signup call itself used to run in the browser (SignupForm called
// supabase.auth.signUp directly). It now runs here so that the one thing a
// browser cannot do, creating the new account's organization with the
// service role, happens in the same request as the account itself. The
// Supabase side is otherwise identical: same signUp, same confirmation
// email, same redirect back through /api/auth/callback, and when email
// confirmation is off, the session cookies are set on this response.
//
// Returns { session: boolean, next: string }. The form navigates to `next`
// when a session is active and shows "check your email" when not.
//
// Invited signups: when `inviteToken` names a live invite for THIS email,
// the new account gets no personal organization. It lands on the invite's
// accept page instead (directly, or via the confirmation email's redirect),
// which adds the membership. A token that is stale or for another address
// is ignored and the signup proceeds as a normal one.
export async function POST(request: Request) {
  let body: {
    email?: unknown;
    password?: unknown;
    firstName?: unknown;
    lastName?: unknown;
    inviteToken?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const inviteToken =
    typeof body.inviteToken === "string" && /^[A-Za-z0-9_-]{16,200}$/.test(body.inviteToken)
      ? body.inviteToken
      : null;
  const invite = inviteToken ? await getInviteByToken(inviteToken) : null;
  const invited =
    inviteIsRedeemable(invite) && invite.email.trim().toLowerCase() === email.toLowerCase();
  const next = invited ? `/invite/${inviteToken}` : "/admin";

  const { origin } = new URL(request.url);
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
      // Stored on the auth.users row itself (not the profiles table), so it
      // is available immediately after signup — read back via
      // user.user_metadata wherever the admin's own name is displayed.
      data: { first_name: firstName, last_name: lastName },
    },
  });

  if (error) {
    // Some auth failures surface with a useless stringified message (e.g.
    // "{}" when the confirmation-email send 500s); the form substitutes a
    // human sentence for anything JSON-shaped.
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // With email confirmation on, signing up an address that already exists
  // returns an obfuscated user with no identities (and no row was created),
  // so there is nothing to attach an organization to. Real new users always
  // carry at least one identity.
  const isNewUser = Boolean(data.user && (data.user.identities?.length ?? 0) > 0);

  if (data.user && isNewUser && invited) {
    console.log(`[auth/signup] user ${data.user.id} signed up via invite; no personal org created`);
  } else if (data.user && isNewUser) {
    try {
      const { orgId, created } = await createPersonalOrg({
        userId: data.user.id,
        email: data.user.email ?? email,
        firstName,
      });
      console.log(
        `[auth/signup] user ${data.user.id} -> org ${orgId} (${created ? "created" : "already existed"})`
      );
    } catch (err) {
      // The account exists and the confirmation email is already on its way,
      // so this cannot be undone from here. It is logged as loudly as
      // possible; getActiveOrg() will log again on every admin load until
      // the membership is repaired.
      console.error(
        `[auth/signup] FAILED to create an organization for new user ${data.user.id} (${email}):`,
        err
      );
    }
  }

  if (data.session && data.user) {
    // Only reachable when email confirmation is disabled: the session is
    // already active and its cookies are on this response.
    await logLoginEvent(supabase, data.user.id, data.user.email ?? null);
    return NextResponse.json({ session: true, next });
  }

  return NextResponse.json({ session: false, next });
}
