import type { Metadata } from "next";
import { buildStudyMetadata, StudyEntry } from "./study-entry";

// The generic survey link. Everything it does — the survey lookup, the
// archived/draft gates, the metadata — lives in study-entry.tsx, shared with
// the prospect-token route at /study/[slug]/[token]. This file is only the
// route binding.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return buildStudyMetadata(slug);
}

export default async function PublicStudyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ test?: string; testEmail?: string; src?: string }>;
}) {
  const [{ slug }, { test, testEmail, src }] = await Promise.all([params, searchParams]);

  // No prospect: this is the anonymous flow, which starts on the welcome
  // screen and asks for name and email in the intake form.
  return <StudyEntry slug={slug} test={test} testEmail={testEmail} src={src} />;
}
