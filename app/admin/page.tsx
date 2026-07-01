import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // surveys_public_read (RLS) intentionally allows anyone to read any
  // survey, since the unauthenticated respondent flow needs to look one up
  // by slug. That means an unfiltered select here would return every
  // admin's surveys, not just the current one's, so ownership has to be
  // filtered explicitly rather than left to RLS.
  const { data: surveys, error } = await supabase
    .from("surveys")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your Surveys</h1>
        <Link
          href="/admin/surveys/new"
          className="rounded bg-black px-3 py-2 text-sm text-white"
        >
          New survey
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error.message}</p>}

      {!error && (!surveys || surveys.length === 0) && (
        <p className="text-sm text-neutral-500">No surveys yet.</p>
      )}

      {surveys && surveys.length > 0 && (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-4">Title</th>
              <th className="py-2 pr-4">Slug</th>
              <th className="py-2 pr-4">Created</th>
            </tr>
          </thead>
          <tbody>
            {surveys.map((survey) => (
              <tr key={survey.id} className="border-b hover:bg-neutral-50">
                <td className="py-2 pr-4">
                  <Link href={`/admin/surveys/${survey.id}`} className="underline">
                    {survey.title}
                  </Link>
                </td>
                <td className="py-2 pr-4 font-mono text-xs text-neutral-600">{survey.slug}</td>
                <td className="py-2 pr-4">{new Date(survey.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
