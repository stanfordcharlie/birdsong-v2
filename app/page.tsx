import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AccountHeader } from "@/components/AccountHeader";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f8f7]">
      {user && <AccountHeader />}
      <div className="flex flex-1 flex-col items-center justify-center gap-10 p-8">

        {/* Welcome card */}
        <div className="flex w-full max-w-lg flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#0a0a0a]">Welcome to Birdsong</h1>
          <p className="text-sm text-muted-foreground">
            What would you like to do?
          </p>
        </div>

        {/* Action cards */}
        <div className="grid w-full max-w-lg grid-cols-1 gap-3">
          <Link href="/admin/surveys/new" className="group flex items-center justify-between rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm transition-all hover:border-[#0a0a0a] hover:shadow-md">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-[#0a0a0a]">Create a new survey</span>
              <span className="text-xs text-muted-foreground">Build and launch an AI-moderated interview</span>
            </div>
            <svg className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>

          <Link href="/admin" className="group flex items-center justify-between rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm transition-all hover:border-[#0a0a0a] hover:shadow-md">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-[#0a0a0a]">View dashboard</span>
              <span className="text-xs text-muted-foreground">See your surveys, responses, and leads</span>
            </div>
            <svg className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>

          <Link href="/admin/profile" className="group flex items-center justify-between rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm transition-all hover:border-[#0a0a0a] hover:shadow-md">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-[#0a0a0a]">Company profile</span>
              <span className="text-xs text-muted-foreground">Set your ICP, brand voice, and survey defaults</span>
            </div>
            <svg className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>

      </div>
    </div>
  );
}
