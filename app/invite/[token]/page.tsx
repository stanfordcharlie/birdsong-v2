import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { acceptInvite, getInviteByToken, inviteIsRedeemable, TeamRuleError } from "@/lib/org-team";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { SignOutButton } from "@/components/SignOutButton";

// The invite landing page. Outside /admin on purpose: a person arriving here
// usually has no account yet. It is exempt from admin auth in middleware.ts
// and listed in AdminChrome's bare routes; those two lists are kept in step
// by hand.
//
// Security model, in one sentence: the token gets you to this page, and only
// the account whose email matches the invite gets past it.

const LINK_CLASS = "font-semibold underline underline-offset-[3px]";
const CTA_CLASS =
  "mt-1.5 flex w-full items-center justify-center rounded-full bg-[#241f18] px-6 py-[15px] text-[16px] font-semibold text-[#faf8f1]";
const SECONDARY_CTA_CLASS =
  "flex w-full items-center justify-center rounded-full border border-[#241f18]/20 px-6 py-[15px] text-[16px] font-semibold text-[#241f18]";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  if (!inviteIsRedeemable(invite)) {
    return (
      <AuthScreen
        heading="This invite is no longer valid"
        subcopy="It may have expired or already been used. Ask the person who invited you to send a new one."
        align="center"
        card={false}
        belowCard={
          <Link href="/admin/login" className={LINK_CLASS}>
            Go to log in
          </Link>
        }
      >
        <span />
      </AuthScreen>
    );
  }

  const inviter = invite.invitedByName ?? "A teammate";
  const user = await getCurrentUser();

  if (!user) {
    const next = encodeURIComponent(token);
    return (
      <AuthScreen
        heading={`Join ${invite.orgName}`}
        subcopy={`${inviter} invited you to ${invite.orgName} on Birdsong as ${invite.role === "admin" ? "an admin" : "a member"}.`}
        belowCard={
          <>
            This invite is for <span className="font-semibold">{invite.email}</span>.
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-[15px] leading-snug text-[#241f18]/80">
            Create an account with that address, or log in if you already have one, and you will land back here.
          </p>
          <Link href={`/admin/signup?invite=${next}`} className={CTA_CLASS}>
            Create account
          </Link>
          <Link href={`/admin/login?invite=${next}`} className={SECONDARY_CTA_CLASS}>
            Log in
          </Link>
        </div>
      </AuthScreen>
    );
  }

  const signedInEmail = (user.email ?? "").trim().toLowerCase();
  if (signedInEmail !== invite.email.trim().toLowerCase()) {
    return (
      <AuthScreen
        heading="This invite is for a different email"
        subcopy={`It was sent to ${invite.email}. You are signed in as ${user.email ?? "another account"}.`}
        align="center"
        card={false}
        belowCard={
          <span className="inline-flex items-center gap-3">
            <SignOutButton className={`${LINK_CLASS} text-[#241f18]`} />
            <Link href="/admin" className={LINK_CLASS}>
              Back to Birdsong
            </Link>
          </span>
        }
      >
        <span />
      </AuthScreen>
    );
  }

  try {
    await acceptInvite({ token, user: { id: user.id, email: user.email ?? null } });
  } catch (err) {
    if (err instanceof TeamRuleError) {
      return (
        <AuthScreen heading="This invite could not be accepted" subcopy={err.message} align="center" card={false}>
          <span />
        </AuthScreen>
      );
    }
    throw err;
  }
  redirect("/admin");
}
