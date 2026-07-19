import { getCurrentUser } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { ChangeEmailForm } from "./ChangeEmailForm";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AddSampleDataButton, RemoveSampleDataButton } from "@/components/SampleDataControls";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="admin-container flex flex-col">
      <div className="mb-10 flex flex-col gap-2">
        <span className="type-label">Settings</span>
        <h1 className="type-page-title">Settings</h1>
      </div>

      <div className="flex flex-col gap-5">
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <h2 className="type-heading">Account</h2>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-5 p-0">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-faint">Email</span>
              <span className="text-[15px] text-card-foreground">{user?.email ?? "Not signed in"}</span>
            </div>
            <SignOutButton className={cn(buttonVariants({ variant: "secondary" }))} />
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <h2 className="type-heading">Change email</h2>
          </CardHeader>
          <CardContent className="p-0">
            <ChangeEmailForm />
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <h2 className="type-heading">Change password</h2>
          </CardHeader>
          <CardContent className="p-0">
            <ChangePasswordForm />
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <h2 className="type-heading">Sample data</h2>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-3 p-0">
            <p className="text-sm text-muted-foreground">
              Explore Birdsong with a demo survey and eight realistic test responses. Sample data
              never counts as real leads, never emails you, and removes cleanly.
            </p>
            <div className="flex items-center gap-3">
              <AddSampleDataButton className={cn(buttonVariants({ variant: "secondary" }))} />
              <RemoveSampleDataButton
                className={cn(buttonVariants({ variant: "secondary" }), "text-destructive")}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
