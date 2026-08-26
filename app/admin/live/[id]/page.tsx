import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, PageHeader, PageShell } from "@/components/admin/ui";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { formatRelativeTime } from "@/lib/format";
import type { InterviewMessage } from "@/lib/interview/types";
import { LiveTranscript } from "./LiveTranscript";

// Read-only window onto one in-progress interview. The transcript is whatever
// /api/interview/continue has already persisted (it rewrites the messages
// column on every turn), streamed in by Realtime from there on. Nothing here
// writes, and nothing here can reach the interview.
export default async function LiveResponsePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  // Cookie-authenticated client, so responses_owner_all (RLS) is what scopes
  // this row to the signed-in owner. The explicit user_id filter on top
  // matches the leads page idiom, and it is the same predicate Realtime
  // re-evaluates for the subscription in LiveTranscript.
  const { data: response } = await supabase
    .from("responses")
    .select("id, respondent_name, respondent_email, messages, completed, created_at, is_test, surveys(title)")
    .eq("id", id)
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  // Also the not-yours case: RLS returns no row rather than an error, and a
  // 404 is the right answer either way.
  if (!response) {
    notFound();
  }

  const messages = (response.messages as unknown as InterviewMessage[] | null) ?? [];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Live"
        title={response.respondent_name || "Anonymous respondent"}
        badge={
          <>
            {response.is_test && <Badge variant="warning">Test</Badge>}
            {response.completed && <Badge variant="live">Finished</Badge>}
          </>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span>{response.surveys?.title ?? "Unknown survey"}</span>
            <span aria-hidden>·</span>
            <span suppressHydrationWarning>Started {formatRelativeTime(response.created_at)}</span>
            {response.respondent_email && (
              <>
                <span aria-hidden>·</span>
                <span>{response.respondent_email}</span>
              </>
            )}
          </span>
        }
      />

      <LiveTranscript
        responseId={response.id}
        initialMessages={messages}
        initialCompleted={response.completed}
      />

      {response.completed && (
        <p className="type-body mt-4 text-muted-foreground">
          <Link href={`/admin/responses/${response.id}`} className="focus-ring rounded-control underline">
            Open the full response
          </Link>{" "}
          for the score, pain points, and call script.
        </p>
      )}
    </PageShell>
  );
}
