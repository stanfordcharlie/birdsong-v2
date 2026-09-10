"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/admin/ui";

// The Home page's client piece: the composer under the greeting. It is an
// entry point rather than a feature: a launcher that navigates to study
// creation, not a chat thread, so nothing the visitor types is sent
// anywhere. It is also the page's only way to start a study, so its button
// carries the same "New study" label as the studies index and the nav. The
// header's search field is components/admin/GlobalSearch.

export function HomeComposer({ href }: { href: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    router.push(href);
  }

  return (
    <Card padding="compact">
      <form onSubmit={submit} className="flex items-center gap-3">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Describe what you want to learn from your customers"
          placeholder="What do you want to learn from your customers?"
          className="type-body focus-ring h-9 min-w-0 flex-1 rounded-control bg-transparent px-2 placeholder:text-faint"
        />
        <Button type="submit" size="sm">
          New study
        </Button>
      </form>
    </Card>
  );
}
