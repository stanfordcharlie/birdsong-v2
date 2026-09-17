import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, PageHeader, PageShell, RelativeTime } from "@/components/admin/ui";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrg } from "@/lib/org";
import type { InterviewMessage } from "@/lib/interview/types";
import { LiveTranscript } from "./LiveTranscript";

// Read-only window onto one in-progress interview. The transcript is whatever
// /api/interview/continue has already persisted (it rewrites the messages
// column on every turn), streamed in by Realtime from there on. Nothing here
// writes, and nothing here can reach the interview.
export default async function LiveResponsePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  await requireActiveOrg();

  // Cookie-authenticated client, so the org-member read policy on responses
  // is what scopes this row to the caller's organization. It is the same
  // predicate Realtime re-evaluates for the subscription in LiveTranscript.
  const { data: response } = await supabase
    .from("responses")
    .select("id, respondent_name, respondent_email, messages, completed, created_at, is_test, surveys(title)")
    .eq("id", id)
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
        eyebrow={
          <Link href="/admin/live" className="focus-ring rounded-control hover:text-card-foreground">
            Live
          </Link>
        }
        title={response.respondent_name || "Anonymous respondent"}
        badge={
          <>
            {response.is_test && <Badge variant="warning">Test</Badge>}
            {response.completed && <Badge variant="count">Finished</Badge>}
          </>
        }
        meta={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{response.surveys?.title ?? "Unknown study"}</span>
            <span aria-hidden>·</span>
            <RelativeTime date={response.created_at} prefix="started" />
            {response.respondent_email && (
              <>
                <span aria-hidden>·</span>
                <span>{response.respondent_email}</span>
              </>
            )}
          </span>
        }
        actions={
          response.completed ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/admin/responses/${response.id}`}>Open response</Link>
            </Button>
          ) : undefined
        }
      />

      <LiveTranscript
        responseId={response.id}
        initialMessages={messages}
        initialCompleted={response.completed}
      />
    </PageShell>
  );
}
