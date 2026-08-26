import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
    <div className="admin-container flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <Link
          href="/admin/live"
          className="type-label transition-colors hover:text-card-foreground"
        >
          Live
        </Link>
        <h1 className="type-page-title">{response.respondent_name || "Anonymous respondent"}</h1>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <span className="type-meta">{response.surveys?.title ?? "Unknown survey"}</span>
          <span className="type-meta" aria-hidden>
            ·
          </span>
          <span className="type-meta" suppressHydrationWarning>
            Started {formatRelativeTime(response.created_at)}
          </span>
          {response.respondent_email && (
            <>
              <span className="type-meta" aria-hidden>
                ·
              </span>
              <span className="type-meta">{response.respondent_email}</span>
            </>
          )}
          {response.is_test && <Badge variant="warning">Test</Badge>}
          {response.completed && <Badge variant="success">Finished</Badge>}
        </div>
      </div>

      <LiveTranscript
        responseId={response.id}
        initialMessages={messages}
        initialCompleted={response.completed}
      />

      {response.completed && (
        <p className="text-sm text-muted-foreground">
          <Link href={`/admin/responses/${response.id}`} className="text-indigo hover:underline">
            Open the full response
          </Link>{" "}
          for the score, pain points, and call script.
        </p>
      )}
    </div>
  );
}
