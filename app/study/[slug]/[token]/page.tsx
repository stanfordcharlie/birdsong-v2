import type { Metadata } from "next";
import { resolveProspectToken } from "@/lib/prospects/lookup";
import { buildStudyMetadata, StudyEntry } from "../study-entry";

// A prospect's personal survey link: /study/[slug]/[token].
//
// The token resolves to the person we invited, which is what lets the
// landing page greet them by name and lets the interview skip the name and
// email intake. Resolution is service-role only (prospects has no anon
// policy) and is scoped to this route's [slug].
//
// NOTHING HERE WRITES. Rendering this page must stay free of writes, API
// calls and Anthropic calls, because it is not the recipient who loads it
// first: enterprise mail security (Defender, Proofpoint, Mimecast) fetches
// every link in a message before it is delivered. The start of an interview
// is the button on the landing page, never the arrival of a request.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  // Deliberately the generic survey preview, with nothing about the
  // prospect in it — see the note in buildStudyMetadata.
  return buildStudyMetadata(slug);
}

export default async function ProspectStudyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; token: string }>;
  searchParams: Promise<{ test?: string; testEmail?: string; src?: string }>;
}) {
  const [{ slug, token }, { test, testEmail, src }] = await Promise.all([params, searchParams]);

  // Null for an unknown token, a token issued for a different survey, or a
  // segment that was never token-shaped. All three fall through to the
  // anonymous flow below rather than 404ing: a dead link in a cold email
  // must still deliver a working survey, and a 404 would also confirm to
  // anyone probing which tokens are real.
  const prospect = await resolveProspectToken(token, slug);

  return (
    <StudyEntry slug={slug} test={test} testEmail={testEmail} src={src} prospect={prospect} />
  );
}
