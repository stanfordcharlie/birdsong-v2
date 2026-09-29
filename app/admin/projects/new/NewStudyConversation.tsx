"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, ChatInput, PageTopBar, Waveform } from "@/components/admin/ui";
import { bg, border, radius, text } from "@/components/admin/ui/tokens";
import type { BriefMessage } from "@/lib/brief/types";
import { isStructuredGuide, type StructuredGuide } from "@/lib/studies/guide";
import { mapToStudy, toExtractedBrief } from "@/lib/study-brief/mapToStudy";
import { OPENING_MESSAGE } from "@/lib/study-brief/prompt";
import { applyPatch, sanitizePatch } from "@/lib/study-brief/schema";
import {
  DRAFT_KEY_PREFIX,
  EMPTY_BRIEF,
  LAUNCHER_SEED_KEY,
  coerceFieldValue,
  isBriefFieldKey,
  isFieldFilled,
  isReadyToCreate,
  sanitizeBrief,
  type BriefFieldKey,
  type StudyBrief,
} from "@/lib/study-brief/types";
import { cn } from "@/lib/utils";
import {
  BRIEF_FIELD_LABELS,
  BriefPanel,
  DEFAULT_RESPONDENT_CHOICES,
  RESPONDENT_FIELD_KEYS,
  respondentFieldDefs,
  type AiWrites,
  type RespondentChoices,
} from "./BriefPanel";
import { createStudy } from "./createStudy";

const OPENER: BriefMessage = { role: "assistant", content: OPENING_MESSAGE };

const NETWORK_FAILURE = "Couldn't reach Birdsong. Check your connection and try again.";

// --- Response reading --------------------------------------------------------
// The brief routes answer with JSON on every path they control, including
// failures ({ error, code, requestId }). A body that is not JSON means the
// request never reached the route.

async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = JSON.parse(await res.text());
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** The server's own sentence when it sent one, with its request id; a status-bearing fallback otherwise. */
function failureMessage(res: Response, data: Record<string, unknown> | null, fallback: string): string {
  const serverMessage = typeof data?.error === "string" && data.error.trim() ? data.error.trim() : null;
  const requestId = typeof data?.requestId === "string" && data.requestId ? data.requestId : null;
  const base = serverMessage ?? `${fallback} (HTTP ${res.status}).`;
  return requestId ? `${base} Request ${requestId}.` : base;
}

// --- The draft in sessionStorage ---------------------------------------------
// Everything the page would lose on a refresh, under a key carrying the draft
// id from the address. sessionStorage, so it is this tab's and ends with it.

type GuideCache = { key: string; guide: StructuredGuide };

type Draft = {
  messages: BriefMessage[];
  chips: string[];
  brief: StudyBrief;
  manualKeys: BriefFieldKey[];
  slug: string | null;
  respondent: RespondentChoices;
  guide: GuideCache | null;
};

const DRAFT_ID = /^[a-z0-9]{6,40}$/;

function readDraft(id: string): Draft | null {
  try {
    const raw = window.sessionStorage.getItem(`${DRAFT_KEY_PREFIX}${id}`);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Partial<Draft> | null;
    if (!stored || typeof stored !== "object") return null;

    const messages = Array.isArray(stored.messages)
      ? stored.messages.filter(
          (m): m is BriefMessage =>
            typeof m === "object" &&
            m !== null &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string"
        )
      : [];
    const respondent = { ...DEFAULT_RESPONDENT_CHOICES };
    for (const key of RESPONDENT_FIELD_KEYS) {
      const choice = stored.respondent?.[key];
      if (choice) respondent[key] = { on: choice.on === true, required: choice.required === true };
    }
    const guide =
      stored.guide && typeof stored.guide.key === "string" && isStructuredGuide(stored.guide.guide)
        ? stored.guide
        : null;

    return {
      messages: messages.length > 0 ? messages : [OPENER],
      chips: Array.isArray(stored.chips) ? stored.chips.filter((c): c is string => typeof c === "string") : [],
      brief: sanitizeBrief(stored.brief),
      manualKeys: Array.isArray(stored.manualKeys) ? stored.manualKeys.filter(isBriefFieldKey) : [],
      slug: typeof stored.slug === "string" ? stored.slug : null,
      respondent,
      guide,
    };
  } catch {
    return null;
  }
}

function writeDraft(id: string, draft: Draft): void {
  try {
    window.sessionStorage.setItem(`${DRAFT_KEY_PREFIX}${id}`, JSON.stringify(draft));
  } catch {
    // Storage is full or switched off. The brief is still in memory; it
    // just will not survive a refresh.
  }
}

/** The text typed into the Home launcher, read once and removed. */
function takeLauncherSeed(): string | null {
  try {
    const seed = window.sessionStorage.getItem(LAUNCHER_SEED_KEY);
    if (seed !== null) window.sessionStorage.removeItem(LAUNCHER_SEED_KEY);
    return seed && seed.trim() ? seed.trim() : null;
  } catch {
    return null;
  }
}

// --- Thread pieces -----------------------------------------------------------

/** The 32px ink tile that opens every Birdsong turn. */
function BirdsongTile() {
  return (
    <span
      aria-hidden
      className={cn("flex h-8 w-8 shrink-0 items-center justify-center", radius.chip, bg.ink)}
    >
      <svg width="14" height="12" viewBox="0 0 14 12" className="fill-[color:hsl(var(--ds-accent-bright))]">
        <rect x="0" y="4" width="2" height="4" rx="1" />
        <rect x="4" y="1" width="2" height="10" rx="1" />
        <rect x="8" y="3" width="2" height="6" rx="1" />
        <rect x="12" y="5" width="2" height="2" rx="1" />
      </svg>
    </span>
  );
}

export function NewStudyConversation({
  orgId,
  initialDraftId,
}: {
  orgId: string;
  /** `?draft=` from the address, when the page was opened or refreshed with one. */
  initialDraftId: string | null;
}) {
  const router = useRouter();

  const [draftId, setDraftId] = useState<string | null>(null);
  const [messages, setMessages] = useState<BriefMessage[]>([OPENER]);
  const [chips, setChips] = useState<string[]>([]);
  const [brief, setBrief] = useState<StudyBrief>(EMPTY_BRIEF);
  const [manualKeys, setManualKeys] = useState<BriefFieldKey[]>([]);
  const [slug, setSlug] = useState<string | null>(null);
  const [respondent, setRespondent] = useState<RespondentChoices>(DEFAULT_RESPONDENT_CHOICES);
  const [guideCache, setGuideCache] = useState<GuideCache | null>(null);
  // Which fields the AI wrote and when. This is the only thing that tells
  // an AI write apart from a manual edit: editField never touches it, and
  // the brief itself carries no flag. Not persisted with the draft, so a
  // refresh restores the fields without replaying their flashes.
  const [aiWrites, setAiWrites] = useState<AiWrites>({});
  // "Roles filled. Sponsor updated", for the polite live region. Keyed so
  // the same sentence twice in a row is still announced.
  const [announcement, setAnnouncement] = useState<{ id: number; text: string } | null>(null);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [createPhase, setCreatePhase] = useState<"idle" | "drafting" | "creating">("idle");
  const [createError, setCreateError] = useState<string | null>(null);

  // What a request in flight must read at the moment it sends or lands, not
  // what was current when its handler was created.
  const latest = useRef({ messages, chips, brief, manualKeys, loading });
  latest.current = { messages, chips, brief, manualKeys, loading };

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  // Whether the thread was at the bottom before this render. A ref: it is
  // read inside the scroll effect and must not itself cause a render.
  const pinnedToBottom = useRef(true);
  const started = useRef(false);

  const send = useCallback(async (raw: string, base?: BriefMessage[]) => {
    const sent = raw.trim();
    if (!sent || latest.current.loading) return;

    const before = base ?? latest.current.messages;
    const chipsBefore = latest.current.chips;
    const next: BriefMessage[] = [...before, { role: "user", content: sent }];

    // Sending is a request to see what comes back, so it re-pins even if the
    // reader had scrolled up.
    pinnedToBottom.current = true;
    latest.current.loading = true;
    setMessages(next);
    setChips([]);
    setInput("");
    setSendError(null);
    setLoading(true);

    // A turn that did not land is taken back out of the thread and put back
    // in the input, so it can be sent again without retyping, and the
    // transcript never carries a message nobody answered.
    function restore(message: string) {
      setMessages(before.length > 0 ? before : [OPENER]);
      setChips(chipsBefore);
      setInput(sent);
      setSendError(message);
      setLoading(false);
    }

    let res: Response;
    try {
      res = await fetch("/api/surveys/brief/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          brief: latest.current.brief,
          manualKeys: latest.current.manualKeys,
        }),
      });
    } catch (err) {
      restore(err instanceof TypeError ? NETWORK_FAILURE : "Something went wrong sending that. Try again.");
      return;
    }

    const data = await readJson(res);
    if (!res.ok) {
      restore(failureMessage(res, data, "That message didn't go through"));
      return;
    }
    const reply = typeof data?.reply === "string" ? data.reply.trim() : "";
    if (!reply) {
      restore(failureMessage(res, data, "Birdsong returned no text. Try sending that again"));
      return;
    }

    // The server already dropped every field that was marked manual when the
    // request left. This drops the ones edited while it was in flight.
    const rawPatch =
      typeof data?.brief_patch === "object" && data.brief_patch !== null
        ? (data.brief_patch as Record<string, unknown>)
        : {};
    const { patch } = sanitizePatch(rawPatch, new Set(latest.current.manualKeys));

    // The fields this reply actually changed, against the brief as it stood
    // when the reply landed. A patch that repeats a value is not a write.
    const briefBefore = latest.current.brief;
    const changed = (Object.keys(patch) as BriefFieldKey[]).filter(
      (key) => JSON.stringify(patch[key]) !== JSON.stringify(briefBefore[key])
    );
    if (changed.length > 0) {
      const at = Date.now();
      setAiWrites((prev) => {
        const next = { ...prev };
        for (const key of changed) next[key] = at;
        return next;
      });
      setAnnouncement({
        id: at,
        text: changed
          .map((key) => `${BRIEF_FIELD_LABELS[key]} ${isFieldFilled(briefBefore, key) ? "updated" : "filled"}`)
          .join(". "),
      });
    }

    setBrief((prev) => applyPatch(prev, patch));
    setMessages([...next, { role: "assistant", content: reply }]);
    setChips(
      Array.isArray(data?.chips) ? data.chips.filter((chip): chip is string => typeof chip === "string") : []
    );
    setLoading(false);
  }, []);

  // Once, on mount: find or make the draft id, restore what was stored under
  // it, and otherwise start from whatever the Home launcher was given.
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let id = initialDraftId && DRAFT_ID.test(initialDraftId) ? initialDraftId : null;
    const stored = id ? readDraft(id) : null;

    if (!id) {
      id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
      // The address carries the id so a refresh finds the same draft. No
      // navigation: the page is already the one this address names.
      window.history.replaceState(null, "", `?draft=${id}`);
    }
    setDraftId(id);

    if (stored) {
      setMessages(stored.messages);
      setChips(stored.chips);
      setBrief(stored.brief);
      setManualKeys(stored.manualKeys);
      setSlug(stored.slug);
      setRespondent(stored.respondent);
      setGuideCache(stored.guide);
      return;
    }

    const seed = takeLauncherSeed();
    // What was typed on Home is the first message, and Birdsong answers it
    // rather than opening with a question of its own.
    if (seed) void send(seed, []);
  }, [initialDraftId, send]);

  useEffect(() => {
    if (!draftId) return;
    writeDraft(draftId, { messages, chips, brief, manualKeys, slug, respondent, guide: guideCache });
  }, [draftId, messages, chips, brief, manualKeys, slug, respondent, guideCache]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading, messages.length]);

  // Scroll the THREAD, not the document: scrollIntoView walks every
  // scrollable ancestor and would drag the page up under the panel.
  useEffect(() => {
    const el = threadRef.current;
    if (!el || !pinnedToBottom.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [messages, chips, loading]);

  function handleThreadScroll() {
    const el = threadRef.current;
    if (!el) return;
    pinnedToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight <= 100;
  }

  // A manual edit. The field is the admin's from here on: the server drops
  // it from every later suggestion.
  function editField(key: BriefFieldKey, value: unknown) {
    const coerced = coerceFieldValue(key, value);
    if (coerced === undefined) return;
    setBrief((prev) => {
      const next = { ...prev, [key]: coerced } as StudyBrief;
      // A brand means nothing without an amount.
      if (key === "giftAmount" && !(typeof coerced === "number" && coerced > 0)) next.giftBrand = null;
      return next;
    });
    setManualKeys((prev) => {
      const keys = key === "giftAmount" ? [key, "giftBrand" as const] : [key];
      return Array.from(new Set([...prev, ...keys]));
    });
    setCreateError(null);
  }

  const ready = isReadyToCreate(brief, slug);
  const busy = createPhase !== "idle";

  async function handleCreate() {
    if (!ready || busy) return;
    setCreateError(null);

    try {
      // The guide is drafted from the brief by the same route the wizard
      // uses, and kept: if the insert fails, pressing Create again does not
      // draft it a second time unless the brief changed underneath it.
      const extracted = toExtractedBrief(brief);
      const key = JSON.stringify(extracted);
      let guide = guideCache?.key === key ? guideCache.guide : null;

      if (!guide) {
        setCreatePhase("drafting");
        let res: Response;
        try {
          res = await fetch("/api/surveys/brief/guide", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ brief: extracted }),
          });
        } catch (err) {
          throw new Error(err instanceof TypeError ? NETWORK_FAILURE : "Couldn't draft the guide. Try again.");
        }
        const data = await readJson(res);
        if (!res.ok) throw new Error(failureMessage(res, data, "Couldn't draft the guide"));
        if (!isStructuredGuide(data?.guide)) throw new Error(failureMessage(res, data, "The guide came back empty"));
        guide = data.guide;
        setGuideCache({ key, guide });
      }

      setCreatePhase("creating");
      const id = await createStudy({
        orgId,
        payload: mapToStudy({
          brief,
          guide,
          transcript: messages,
          respondentFields: respondentFieldDefs(respondent),
        }),
        slug: slug ?? brief.externalTitle,
      });

      if (draftId) {
        try {
          window.sessionStorage.removeItem(`${DRAFT_KEY_PREFIX}${draftId}`);
        } catch {
          // Nothing to clean up if storage is unavailable.
        }
      }
      router.push(`/admin/projects/${id}`);
    } catch (err) {
      // The brief stays exactly as it is, in state and in storage.
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && typeof (err as { message?: unknown }).message === "string"
            ? (err as { message: string }).message
            : "Something went wrong";
      setCreateError(message);
      setCreatePhase("idle");
    }
  }

  const notice = createError
    ? ({ kind: "error", message: createError } as const)
    : createPhase === "drafting"
      ? ({ kind: "progress", message: "Drafting the research guide from your brief. This takes a minute or two." } as const)
      : createPhase === "creating"
        ? ({ kind: "progress", message: "Creating the study." } as const)
        : null;

  const lastIsBirdsong = messages.length > 0 && messages[messages.length - 1].role === "assistant";

  return (
    <>
      <PageTopBar
        crumbs={[{ label: "Projects", href: "/admin/projects" }, { label: "New study" }]}
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/admin/projects/new?mode=form">Use the form instead</Link>
            </Button>
            <Button type="button" onClick={handleCreate} disabled={!ready || busy}>
              {createPhase === "drafting" ? "Drafting the guide" : createPhase === "creating" ? "Creating" : "Create study"}
            </Button>
          </>
        }
      />

      {/* The negative margins cancel AdminShell's content padding, so the two
          panels fill everything under the top bar. */}
      <div className="-mx-8 -my-7 flex h-[calc(100vh_-_var(--ds-shell-topbar))]">
        <section
          aria-label="Set up conversation"
          className={cn("flex min-w-0 flex-1 flex-col border-r", border.base)}
        >
          {/* min-h-0 is load-bearing: a flex child refuses to shrink below
              its content by default and would push the input out of the
              panel instead of scrolling. */}
          <div
            ref={threadRef}
            onScroll={handleThreadScroll}
            className="min-h-0 flex-1 overflow-y-auto px-10 py-8"
          >
            <div aria-live="polite" className="flex max-w-[720px] flex-col gap-[22px]">
              {messages.map((message, i) =>
                message.role === "assistant" ? (
                  <div key={i} className="flex gap-[14px]">
                    <BirdsongTile />
                    <div className="flex min-w-0 flex-col gap-[10px] pt-[5px]">
                      <p className={cn("whitespace-pre-wrap break-words text-[15px] leading-[1.55]", text.ink)}>
                        {message.content}
                      </p>
                      {i === messages.length - 1 && lastIsBirdsong && chips.length > 0 && !loading && (
                        <div className="flex flex-wrap gap-[6px]">
                          {chips.map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              onClick={() => void send(chip)}
                              disabled={busy}
                              className={cn(
                                "focus-ring flex h-[30px] items-center border px-3 text-[12px] font-bold transition-colors",
                                "hover:bg-[color:hsl(var(--ds-bg-sidebar))] disabled:pointer-events-none disabled:opacity-50",
                                radius.chip,
                                border.base,
                                bg.base,
                                text.muted
                              )}
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex justify-end">
                    <p
                      className={cn(
                        "max-w-[500px] whitespace-pre-wrap break-words px-4 py-3 text-[15px] leading-[1.5]",
                        "rounded-[var(--ds-radius-card)] rounded-br-[4px]",
                        bg.track,
                        text.ink
                      )}
                    >
                      {message.content}
                    </p>
                  </div>
                )
              )}

              {loading && (
                <div className="flex items-center gap-[14px]" role="status">
                  <BirdsongTile />
                  <Waveform seed="birdsong-replying" bars={5} live height={16} />
                  <span className="sr-only">Birdsong is replying</span>
                </div>
              )}
            </div>
          </div>

          <div className={cn("shrink-0 border-t px-10 pb-6 pt-4", border.base)}>
            <div className="flex max-w-[640px] flex-col gap-2">
              {sendError && (
                <p role="alert" className="text-[13px] text-destructive">
                  {sendError}
                </p>
              )}
              <ChatInput
                ref={inputRef}
                value={input}
                onChange={setInput}
                onSend={() => void send(input)}
                disabled={loading || busy}
                label="Type an answer"
                placeholder="Type an answer, or paste your ICP doc"
              />
            </div>
          </div>
        </section>

        <div aria-live="polite" className="sr-only">
          {announcement && <p key={announcement.id}>{announcement.text}</p>}
        </div>

        <BriefPanel
          brief={brief}
          slug={slug}
          respondent={respondent}
          notice={notice}
          aiWrites={aiWrites}
          onEdit={editField}
          onSlugChange={(value) => setSlug(value.trim() ? value : null)}
          onRespondentChange={setRespondent}
        />
      </div>
    </>
  );
}
