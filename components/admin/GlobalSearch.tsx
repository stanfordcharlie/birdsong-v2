"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Card, SearchInput } from "@/components/admin/ui";
import { WORTH_A_CALL_SCORE_MIN } from "@/lib/leads";
import { cn } from "@/lib/utils";
import { SEARCH_FIELD_ATTR, SEARCH_FOCUS_HASH } from "./SearchShortcut";

// The admin's global search: the field is the palette. Typing opens a
// results popover under it; the query runs in app/api/search. There is no
// spinner: the previous results stay up until the next ones land, so the
// list never flickers between keystrokes.

export type StudyResult = { id: string; title: string; topic: string | null };
export type RespondentResult = {
  id: string;
  name: string;
  email: string | null;
  studyTitle: string | null;
  leadScore: number | null;
};
export type SearchResults = { studies: StudyResult[]; respondents: RespondentResult[] };

const DEBOUNCE_MS = 200;
const MIN_QUERY_LENGTH = 2;

// How SearchShortcut finds the field from any admin route.
const searchFieldAttr: Record<string, string> = { [SEARCH_FIELD_ATTR]: "" };

type Row = { key: string; href: string; primary: string; secondary: string | null; score: number | null };

// The admin's own pages, so the field also finds parts of Birdsong. Matched
// here in the browser against the label, the description and a few words
// people reach for instead; no request involved. The sidebar links to some
// of these and not others, so this is the one complete list.
const PAGES: { href: string; label: string; description: string; also: string[] }[] = [
  { href: "/admin", label: "Home", description: "What is live and what needs you", also: ["dashboard", "overview"] },
  { href: "/admin/leads", label: "Leads", description: "Every completed interview, hottest first", also: ["queue", "calls", "worth a call"] },
  { href: "/admin/live", label: "Live", description: "Interviews happening right now", also: ["in progress", "now"] },
  { href: "/admin/projects", label: "Projects", description: "All of your studies", also: ["studies", "study", "research"] },
  { href: "/admin/projects/new", label: "New study", description: "Start a study", also: ["create", "brief", "start"] },
  { href: "/admin/profile", label: "Company profile", description: "What you sell and who you sell to", also: ["company", "icp", "value proposition"] },
  { href: "/admin/settings", label: "Settings", description: "Account, email, password, notifications, sample data", also: ["account", "slack", "preferences"] },
  { href: "/admin/settings/team", label: "Team", description: "Who is in your workspace", also: ["members", "invite", "teammates", "workspace"] },
];
const PAGES_MAX = 5;

function pageRows(q: string): Row[] {
  const needle = q.trim().toLowerCase();
  if (needle.length < MIN_QUERY_LENGTH) return [];
  return PAGES.filter((page) =>
    [page.label, page.description, ...page.also].some((text) => text.toLowerCase().includes(needle))
  )
    .slice(0, PAGES_MAX)
    .map((page) => ({
      key: `page:${page.href}`,
      href: page.href,
      primary: page.label,
      secondary: page.description,
      score: null,
    }));
}

function toRows(results: SearchResults): { studies: Row[]; respondents: Row[] } {
  return {
    studies: results.studies.map((s) => ({
      key: `study:${s.id}`,
      href: `/admin/projects/${s.id}`,
      primary: s.title,
      secondary: s.topic,
      score: null,
    })),
    respondents: results.respondents.map((r) => ({
      key: `respondent:${r.id}`,
      href: `/admin/responses/${r.id}`,
      primary: r.name,
      secondary: [r.email, r.studyTitle].filter(Boolean).join(" · ") || null,
      score: r.leadScore,
    })),
  };
}

export function GlobalSearch({ className }: { className?: string }) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [selected, setSelected] = useState(0);

  const close = useCallback(() => {
    setOpen(false);
    setSelected(0);
  }, []);

  const clear = useCallback(() => {
    setValue("");
    setResults(null);
    requestId.current += 1;
    close();
  }, [close]);

  // ⌘K from another admin route lands here with #search: take focus, then
  // drop the hash so a reload does not grab focus again.
  useEffect(() => {
    if (window.location.hash !== SEARCH_FOCUS_HASH) return;
    inputRef.current?.focus();
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  // The query. Debounced, minimum two characters, and stale responses are
  // dropped by sequence number rather than aborted so the previous results
  // stay visible until the newest request lands.
  useEffect(() => {
    const q = value.trim();
    if (q.length < MIN_QUERY_LENGTH) {
      setResults(null);
      return;
    }
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data = (await res.json()) as SearchResults;
        if (id !== requestId.current) return;
        setResults(data);
        setSelected(0);
      } catch {
        // Network failure: leave whatever is showing in place.
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);

  // Clicking anywhere outside the field and its popover closes it.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  // Pages match instantly; studies and respondents arrive from the route.
  // The popover opens as soon as either has something to say, and the empty
  // line waits for the route so it never flashes before results land.
  const pages = pageRows(value);
  const rows = results ? toRows(results) : { studies: [], respondents: [] };
  const flat = [...pages, ...rows.studies, ...rows.respondents];
  const longEnough = value.trim().length >= MIN_QUERY_LENGTH;
  const showPopover = open && longEnough && (results !== null || pages.length > 0);
  const showEmpty = results !== null && flat.length === 0;

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      clear();
      return;
    }
    if (!showPopover || flat.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((i) => (i + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((i) => (i - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = flat[selected];
      if (row) {
        close();
        router.push(row.href);
      }
    }
  }

  function renderGroup(label: string, group: Row[], offset: number) {
    if (group.length === 0) return null;
    return (
      <li role="presentation">
        <p className="type-eyebrow px-3 pb-1 pt-3">{label}</p>
        <ul role="group" aria-label={label}>
          {group.map((row, i) => {
            const index = offset + i;
            const active = index === selected;
            return (
              <li
                key={row.key}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={active}
              >
                <Link
                  href={row.href}
                  tabIndex={-1}
                  onClick={close}
                  onMouseMove={() => setSelected(index)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 transition-colors",
                    active ? "bg-secondary" : "hover:bg-secondary"
                  )}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="type-body-sm truncate font-medium">{row.primary}</span>
                    {row.secondary && (
                      <span className="type-meta truncate">{row.secondary}</span>
                    )}
                  </span>
                  {row.score !== null && row.score >= WORTH_A_CALL_SCORE_MIN && (
                    <Badge variant="accent" size="sm">
                      {row.score}
                    </Badge>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </li>
    );
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <SearchInput
        value={value}
        onChange={(next) => {
          setValue(next);
          setOpen(true);
        }}
        placeholder="Search studies, respondents"
        label="Search studies and respondents"
        hint="⌘K"
        inputRef={inputRef}
        className="w-full max-w-none"
        inputProps={{
          ...searchFieldAttr,
          role: "combobox",
          "aria-expanded": showPopover,
          "aria-controls": listId,
          "aria-autocomplete": "list",
          "aria-activedescendant": showPopover && flat.length > 0 ? `${listId}-${selected}` : undefined,
          autoComplete: "off",
          onFocus: () => setOpen(true),
          onKeyDown,
        }}
      />
      {showPopover && (
        <Card padding="flush" className="absolute left-0 right-0 top-full z-50 mt-2">
          <div className="max-h-[400px] overflow-y-auto py-1">
            {showEmpty ? (
              <p className="type-body-sm px-3 py-3 text-muted-foreground">Nothing matches that yet.</p>
            ) : (
              <ul id={listId} role="listbox" aria-label="Search results">
                {renderGroup("Pages", pages, 0)}
                {renderGroup("Studies", rows.studies, pages.length)}
                {renderGroup("Respondents", rows.respondents, pages.length + rows.studies.length)}
              </ul>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
