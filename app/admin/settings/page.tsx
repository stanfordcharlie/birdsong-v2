import { getCurrentUser } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { ChangeEmailForm } from "./ChangeEmailForm";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CARD_SHADOW = "shadow-[0_1px_3px_rgba(0,0,0,0.08)]";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-card-foreground">Settings</h1>

      <Card className={CARD_SHADOW}>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Email
            </span>
            <span className="text-sm text-card-foreground">{user?.email ?? "Not signed in"}</span>
          </div>
          <div className="flex h-9 items-center rounded-control bg-[#111111] px-4">
            <SignOutButton />
          </div>
        </CardContent>
      </Card>

      <Card className={CARD_SHADOW}>
        <CardHeader>
          <CardTitle>Change email</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangeEmailForm />
        </CardContent>
      </Card>

      <Card className={CARD_SHADOW}>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
