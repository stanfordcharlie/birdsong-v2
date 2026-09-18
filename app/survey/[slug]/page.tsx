import type { Metadata } from "next";
import { buildSurveyMetadata, SurveyEntry } from "./survey-entry";

// The generic survey link. Everything it does — the survey lookup, the
// archived/draft gates, the metadata — lives in survey-entry.tsx, shared with
// the prospect-token route at /survey/[slug]/[token]. This file is only the
// route binding.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return buildSurveyMetadata(slug);
}

export default async function PublicSurveyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ test?: string; testEmail?: string; src?: string }>;
}) {
  const [{ slug }, { test, testEmail, src }] = await Promise.all([params, searchParams]);

  // No prospect: this is the anonymous flow, which starts on the welcome
  // screen and asks for name and email in the intake form.
  return <SurveyEntry slug={slug} test={test} testEmail={testEmail} src={src} />;
}
