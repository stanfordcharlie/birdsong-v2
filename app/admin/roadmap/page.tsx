import { createClient } from "@/lib/supabase/server";

const STATUS_LABELS = {
  done: "Done",
  in_progress: "In Progress",
  planned: "Planned",
} as const;

const STATUS_ORDER = ["done", "in_progress", "planned"] as const;

export default async function RoadmapPage() {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("roadmap_items")
    .select("*")
    .order("created_at", { ascending: true });

  const grouped = {
    done: (items ?? []).filter((i) => i.status === "done"),
    in_progress: (items ?? []).filter((i) => i.status === "in_progress"),
    planned: (items ?? []).filter((i) => i.status === "planned"),
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Roadmap</h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {STATUS_ORDER.map((status) => (
          <div key={status} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase text-neutral-500">
              {STATUS_LABELS[status]} ({grouped[status].length})
            </h2>
            <div className="flex flex-col gap-3">
              {grouped[status].length === 0 && (
                <p className="text-sm text-neutral-400">Nothing here yet.</p>
              )}
              {grouped[status].map((item) => (
                <div key={item.id} className="rounded border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-medium text-neutral-900">{item.title}</h3>
                    {item.category && (
                      <span className="shrink-0 rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                        {item.category}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-1 text-sm text-neutral-600">{item.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
