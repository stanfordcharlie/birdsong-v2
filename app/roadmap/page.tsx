import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";

const STATUS_LABELS = {
  done: "Done",
  in_progress: "In Progress",
  planned: "Planned",
} as const;

const STATUS_BADGE_VARIANT: Record<string, BadgeProps["variant"]> = {
  done: "success",
  in_progress: "warning",
  planned: "default",
};

const STATUS_ORDER = ["done", "in_progress", "planned"] as const;

// Deliberately outside /admin and unlinked from any nav: reachable only by
// whoever has the direct URL, not gated behind login. Uses the admin
// client to read since roadmap_items' RLS requires an authenticated
// session, which a visitor here won't have.
export default async function RoadmapPage() {
  const supabase = createAdminClient();

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
    <div className="min-h-screen bg-page">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
        <h1 className="text-xl font-semibold text-card-foreground">Roadmap</h1>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {STATUS_ORDER.map((status) => (
            <div key={status} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_BADGE_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>
                <span className="text-xs text-muted-foreground">
                  {grouped[status].length}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {grouped[status].length === 0 && (
                  <p className="text-sm text-muted-foreground">Nothing here yet.</p>
                )}
                {grouped[status].map((item) => (
                  <Card key={item.id} className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-medium text-card-foreground">{item.title}</h3>
                      {item.category && <Badge variant="outline">{item.category}</Badge>}
                    </div>
                    {item.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
