import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getRecentActivity, type ActivityEvent } from "@/lib/activity";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { userFirstName } from "@/lib/user-name";
import { cn } from "@/lib/utils";
import { GreetingBlock } from "./GreetingBlock";
import { AddSampleDataButton } from "@/components/SampleDataControls";

function ActivityText({ event }: { event: ActivityEvent }) {
  if (event.type === "new_responses") {
    return (
      <>
        {event.count} new response{event.count === 1 ? "" : "s"} on{" "}
        <span className="text-indigo">{event.surveyTitle}</span>
      </>
    );
  }
  return (
    <>
      {event.count} lead{event.count === 1 ? "" : "s"} qualified from{" "}
      <span className="text-indigo">{event.surveyTitle}</span>
    </>
  );
}

const ACTIONS = [
  {
    href: "/admin/surveys/new",
    title: "Create a new survey",
    description: "Build and launch an AI-moderated interview",
  },
  {
    href: "/admin/surveys",
    title: "View dashboard",
    description: "See your surveys, responses, and leads",
  },
  {
    href: "/admin/profile",
    title: "Company profile",
    description: "Set your ICP, brand voice, and survey defaults",
  },
] as const;

const ROW_ANIMATIONS = ["bs-rise-4", "bs-rise-5", "bs-rise-6"];

export default async function AdminHomePage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return null;

  const [{ data: profile }, events, { count: surveyCount }] = await Promise.all([
    supabase.from("profiles").select("contact_name").eq("user_id", user.id).maybeSingle(),
    getRecentActivity(supabase, user.id),
    supabase.from("surveys").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const firstName = userFirstName(user, profile?.contact_name);

  return (
    // Same shared content container as every other admin page — the old
    // full-bleed split screen (a second full-height ink panel next to the
    // nav rail) is gone; the greeting, activity feed, and action rows now
    // stack inside one column on the page surface.
    <div className="admin-container flex flex-col">
      <GreetingBlock firstName={firstName} />

      <section className="bs-rise-2 mt-12">
        <div className="mb-4 flex items-center gap-2 type-label">
          <span className="bs-dot inline-block h-[7px] w-[7px] rounded-full bg-indigo" />
          What&apos;s been happening
        </div>

        {(surveyCount ?? 0) === 0 ? (
          <div className="flex flex-col gap-3.5">
            <p className="text-sm text-muted-foreground">
              No surveys yet. Once you create one and share its link, completed interviews and
              qualified leads show up here.
            </p>
            <Link
              href="/admin/surveys/new"
              className="text-sm font-semibold text-indigo transition-colors hover:text-indigo/80"
            >
              Create your first survey
            </Link>
            <AddSampleDataButton className="self-start text-sm font-medium text-muted-foreground underline underline-offset-2 transition-colors hover:text-card-foreground disabled:opacity-50" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No activity yet — it&apos;ll show up here once responses start coming in.
          </p>
        ) : (
          <div className="flex flex-col gap-3.5">
            {events.map((event, i) => (
              <div
                key={`${event.type}-${event.surveyTitle}`}
                className={cn(
                  "flex items-baseline justify-between gap-4",
                  i < events.length - 1 && "border-b border-border pb-[13px]"
                )}
              >
                <span className="text-sm font-medium text-card-foreground">
                  <ActivityText event={event} />
                </span>
                <span className="whitespace-nowrap type-meta">
                  {formatRelativeTime(event.at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <div className="bs-rise-3 mb-2 type-label">Where to next</div>

        <div className="flex flex-col">
          {ACTIONS.map((action, i) => (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                ROW_ANIMATIONS[i],
                "group flex items-center gap-6 rounded-card px-4 py-6 transition-colors hover:bg-card-foreground/[0.04]",
                i < ACTIONS.length - 1 && "border-b border-border"
              )}
            >
              <span className="min-w-[26px] text-[13px] font-semibold text-faint">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1">
                <div className="mb-1 type-heading">{action.title}</div>
                <div className="text-sm text-muted-foreground">{action.description}</div>
              </div>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-card-foreground"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
