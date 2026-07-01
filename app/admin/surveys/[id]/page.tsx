export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // TODO: fetch survey + responses (pain points, lead scores) from Supabase.
  return (
    <div>
      <h1 className="text-xl font-semibold">Survey {id}</h1>
    </div>
  );
}
