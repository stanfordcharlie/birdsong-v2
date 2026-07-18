import { getCurrentUser } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { ChangeEmailForm } from "./ChangeEmailForm";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex max-w-[720px] flex-col gap-1">
      <span className="text-[13px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
        Settings
      </span>
      <h1 className="mb-7 font-serif text-[40px] font-normal leading-none tracking-[-0.01em] text-card-foreground">
        Settings
      </h1>

      <div className="flex flex-col gap-5">
        <Card className="flex items-start justify-between gap-5 p-6">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-faint">Account</span>
            <span className="mt-2 text-xs text-faint">EMAIL</span>
            <span className="text-[15px] text-card-foreground">{user?.email ?? "Not signed in"}</span>
          </div>
          <div className="flex h-[42px] items-center rounded-control bg-primary px-[18px]">
            <SignOutButton className="font-semibold text-primary-foreground hover:text-primary-foreground/80" />
          </div>
        </Card>

        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <h2 className="font-serif text-xl font-normal text-card-foreground">Change email</h2>
          </CardHeader>
          <CardContent className="p-0">
            <ChangeEmailForm />
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <h2 className="font-serif text-xl font-normal text-card-foreground">Change password</h2>
          </CardHeader>
          <CardContent className="p-0">
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
