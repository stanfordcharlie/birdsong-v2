"use client";

import { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { cn } from "@/lib/utils";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex min-h-screen bg-page text-card-foreground">
      <AdminSidebar expanded={expanded} onToggle={() => setExpanded((prev) => !prev)} />
      <main
        className={cn(
          "flex-1 transition-all duration-200 ease-out",
          expanded ? "pl-56" : "pl-14"
        )}
      >
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
