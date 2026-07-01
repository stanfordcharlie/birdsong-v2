export default async function PublicSurveyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // TODO: look up the survey by slug (public, unauthenticated), show intro +
  // incentive copy, collect respondent info, then start the interview via
  // POST /api/interview/start.
  return (
    <div className="mx-auto max-w-xl p-8">
      <h1 className="text-xl font-semibold">Survey: {slug}</h1>
    </div>
  );
}
