"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

type FieldDef = {
  key: string;
  column: keyof ProfileRow;
  label: string;
  placeholder: string;
  type: "text" | "textarea";
  required?: boolean;
  helper?: string;
  rows?: number;
};

type StepDef = {
  id: string;
  section: string;
  title: string;
  subtitle: string;
  fields?: FieldDef[];
  review?: boolean;
};

const STEPS: StepDef[] = [
  {
    id: "basics",
    section: "Basics",
    title: "Let's start with the essentials",
    subtitle: "The basics we'll use across your workspace and in generated copy.",
    fields: [
      {
        key: "companyName",
        column: "company_name",
        label: "Company name",
        placeholder: "Acme Robotics",
        type: "text",
        required: true,
        helper: "Shown internally and used in generated copy.",
      },
      {
        key: "industry",
        column: "industry",
        label: "Industry",
        placeholder: "e.g. Logistics software",
        type: "text",
      },
      {
        key: "teamSize",
        column: "team_size",
        label: "Team size",
        placeholder: "e.g. 25 employees",
        type: "text",
      },
    ],
  },
  {
    id: "web",
    section: "Web presence",
    title: "Where can people find you online?",
    subtitle: "Optional, but it helps us pull in the right context.",
    fields: [
      { key: "website", column: "website", label: "Website", placeholder: "https://acme.com", type: "text" },
      {
        key: "linkedin",
        column: "linkedin",
        label: "LinkedIn",
        placeholder: "linkedin.com/company/acme",
        type: "text",
      },
    ],
  },
  {
    id: "about",
    section: "What you do",
    title: "In your own words, what does your company do?",
    subtitle: "A couple of sentences is plenty, this shapes every piece of generated copy.",
    fields: [
      {
        key: "description",
        column: "what_we_sell",
        label: "",
        placeholder: "We help mid-size logistics teams cut fuel costs with route-planning software...",
        type: "textarea",
        rows: 6,
        required: true,
        helper: "Write like you would to a new hire on day one.",
      },
    ],
  },
  {
    id: "audience",
    section: "Audience",
    title: "Who are you trying to reach?",
    subtitle: "Describe your ideal customer, their role, company type, or pain points.",
    fields: [
      {
        key: "audience",
        column: "target_icp",
        label: "",
        placeholder:
          "Operations managers at 50-500 person distribution companies frustrated with manual scheduling...",
        type: "textarea",
        rows: 6,
        required: true,
      },
    ],
  },
  {
    id: "value",
    section: "Value proposition",
    title: "What's your value proposition?",
    subtitle: "The one thing you want every interview to reinforce.",
    fields: [
      {
        key: "valueProp",
        column: "value_prop",
        label: "",
        placeholder: "We cut fuel costs 30% by predicting routes before drivers even clock in...",
        type: "textarea",
        rows: 6,
        required: true,
      },
    ],
  },
  {
    id: "voice",
    section: "Brand voice",
    title: "How should we sound?",
    subtitle: "A few words go a long way in keeping generated copy on-brand.",
    fields: [
      { key: "tone", column: "tone", label: "Tone", placeholder: "e.g. Friendly, confident, no jargon", type: "text" },
      {
        key: "avoid",
        column: "words_to_avoid",
        label: "Words or phrases to avoid",
        placeholder: 'e.g. "disrupt," "synergy," exclamation points',
        type: "textarea",
        rows: 3,
      },
    ],
  },
  {
    id: "contact",
    section: "Contact",
    title: "Who should we reach out to?",
    subtitle: "For account updates and anything that needs a human.",
    fields: [
      { key: "contactName", column: "contact_name", label: "Contact name", placeholder: "Jordan Lee", type: "text" },
      {
        key: "contactEmail",
        column: "contact_email",
        label: "Contact email",
        placeholder: "jordan@acme.com",
        type: "text",
      },
    ],
  },
  {
    id: "review",
    section: "Review",
    title: "Everything look right?",
    subtitle: "Jump back into any section to make changes.",
    review: true,
  },
];

const TOTAL_STEPS = STEPS.length;
const SAVE_DEBOUNCE_MS = 600;

function isStepComplete(stepDef: StepDef, data: Record<string, string>): boolean {
  if (!stepDef.fields) return true;
  return stepDef.fields.every((f) => !f.required || (data[f.key] || "").trim().length > 0);
}

function computeInitialStep(data: Record<string, string>): number {
  for (let i = 0; i < STEPS.length - 1; i++) {
    if (!isStepComplete(STEPS[i], data)) return i;
  }
  return STEPS.length - 1;
}

export function CompanyProfileSetupFlow({
  initialData,
  onDone,
}: {
  initialData: Record<string, string>;
  onDone: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState(() => computeInitialStep(initialData));
  const [data, setData] = useState<Record<string, string>>(initialData);
  const [entering, setEntering] = useState(false);
  const [saveNote, setSaveNote] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const saveNoteTimer = useRef<ReturnType<typeof setTimeout>>();
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      userIdRef.current = user?.id ?? null;
    });
  }, []);

  // Flush any pending debounced saves on unmount so a field edited right
  // before navigating away isn't lost to a cancelled timer.
  useEffect(() => {
    return () => {
      Object.values(saveTimers.current).forEach(clearTimeout);
    };
  }, []);

  function scheduleSave(field: FieldDef, value: string) {
    clearTimeout(saveTimers.current[field.key]);
    saveTimers.current[field.key] = setTimeout(async () => {
      if (!userIdRef.current) return;
      const supabase = createClient();
      const payload = { [field.column]: value || null } as ProfileUpdate;
      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("user_id", userIdRef.current);
      if (error) {
        setSaveError(`Couldn't save "${field.label || field.column}": ${error.message}`);
      } else {
        setSaveError(null);
      }
    }, SAVE_DEBOUNCE_MS);
  }

  function setField(field: FieldDef, value: string) {
    setData((prev) => ({ ...prev, [field.key]: value }));
    scheduleSave(field, value);
  }

  // Used before any exit point (Save & exit, Finish setup) so nothing
  // mid-debounce is lost: cancels pending per-field timers and writes
  // the full current state in one call instead.
  async function flushAll() {
    Object.values(saveTimers.current).forEach(clearTimeout);
    saveTimers.current = {};
    if (!userIdRef.current) return;
    const payload: Record<string, string | null> = {};
    for (const stepDef of STEPS) {
      for (const field of stepDef.fields ?? []) {
        payload[field.column] = data[field.key] || null;
      }
    }
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update(payload as ProfileUpdate)
      .eq("user_id", userIdRef.current);
  }

  function goTo(index: number) {
    if (index === step) return;
    setStep(index);
    setEntering(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setEntering(false)));
  }

  function goNext() {
    if (step < TOTAL_STEPS - 1) goTo(step + 1);
  }
  function goBack() {
    if (step > 0) goTo(step - 1);
  }

  async function handleSaveExit() {
    await flushAll();
    setSaveNote("Saved just now, resume anytime");
    clearTimeout(saveNoteTimer.current);
    saveNoteTimer.current = setTimeout(() => setSaveNote(""), 3000);
    setTimeout(() => router.push("/admin"), 900);
  }

  async function handleFinish() {
    setFinishError(null);
    setFinishing(true);
    try {
      await flushAll();
      if (!userIdRef.current) throw new Error("Not signed in.");
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq("user_id", userIdRef.current);
      if (error) throw error;
      onDone();
    } catch (err) {
      setFinishError(err instanceof Error ? err.message : "Something went wrong");
      setFinishing(false);
    }
  }

  const current = STEPS[step];
  const isReview = !!current.review;
  const isolated = !isReview && current.fields?.length === 1 && !current.fields[0].label;
  const progressPercent = Math.round(((step + 1) / TOTAL_STEPS) * 100);
  const stepLabel = isReview
    ? `Step ${step + 1} of ${TOTAL_STEPS}`
    : `Step ${step + 1} of ${TOTAL_STEPS} · ${current.section}`;
  const nextLabel = step === TOTAL_STEPS - 2 ? "Review" : "Continue";

  return (
    <div className="-m-8 flex min-h-screen bg-page">
      {/* Left rail. The -m-8/min-h-screen above cancel AdminShell's own
          p-8 content padding so this rail runs flush against the app's
          existing dark sidebar and to the edges of the content area,
          rather than sitting indented inside another layer of padding.
          The app's own admin nav stays visible; only this flow's own
          step-navigator sidebar is new. */}
      <div className="sticky top-0 flex h-screen w-[220px] shrink-0 flex-col border-r border-border bg-card px-5 py-8">
        <div className="mb-7 text-[15px] font-semibold tracking-[-0.01em] text-card-foreground">
          Company Profile
        </div>

        <div className="flex flex-col">
          {STEPS.map((s, i) => {
            const status = i === step ? "current" : i < step ? "done" : "upcoming";
            return (
              <div key={s.id} className="flex cursor-pointer gap-3" onClick={() => goTo(i)}>
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      status === "current" && "bg-primary text-primary-foreground",
                      status === "done" && "bg-success-bg text-success",
                      status === "upcoming" && "border border-border bg-card text-faint"
                    )}
                  >
                    {status === "done" ? "✓" : i + 1}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="min-h-[20px] w-px flex-1 bg-border" />
                  )}
                </div>
                <div className="pb-6 pt-0.5">
                  <div
                    className={cn(
                      "text-sm",
                      status === "current" && "font-semibold text-card-foreground",
                      status === "done" && "font-medium text-muted-foreground",
                      status === "upcoming" && "font-medium text-faint"
                    )}
                  >
                    {s.section}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-auto flex flex-col gap-1">
          {saveError && (
            <div role="alert" className="text-xs font-medium text-destructive">
              {saveError}
            </div>
          )}
          <div className="text-xs text-faint">{saveNote || "Autosaved as you go"}</div>
        </div>
      </div>

      {/* Right column */}
      <div className="flex flex-1 justify-center px-10 py-14">
        <div className="w-full max-w-[680px]">
          <div className="mb-3.5 flex items-center justify-between">
            <div className="text-sm text-faint">{stepLabel}</div>
            <Button type="button" variant="secondary" size="sm" onClick={handleSaveExit}>
              Save &amp; exit
            </Button>
          </div>

          <div className="mb-9 h-1 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div
            className="transition-all duration-[260ms] ease-out"
            style={{
              opacity: entering ? 0 : 1,
              transform: entering ? "translateY(8px)" : "translateY(0)",
            }}
          >
            <Card className="flex min-h-[540px] flex-col p-11">
              {isReview ? (
                <div className="flex flex-1 flex-col">
                  <h2 className="mb-2 font-serif text-[28px] font-normal tracking-[-0.01em] text-card-foreground">
                    {current.title}
                  </h2>
                  <p className="mb-8 text-[15.5px] leading-[1.6] text-muted-foreground">{current.subtitle}</p>

                  <div className="flex flex-col gap-5">
                    {STEPS.filter((s) => !s.review).map((s, i) => (
                      <div key={s.id} className="rounded-card border border-border p-[18px_20px]">
                        <div className="mb-2.5 flex items-center justify-between">
                          <div className="text-[13px] font-semibold text-card-foreground">{s.section}</div>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => goTo(i)}
                            className="h-[30px] px-3"
                          >
                            Edit
                          </Button>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {(s.fields ?? []).map((f) => (
                            <div key={f.key} className="text-sm text-muted-foreground">
                              <span className="text-faint">{f.label || s.section}:</span>{" "}
                              {data[f.key] ? data[f.key] : "—"}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-9">
                    <Button type="button" variant="secondary" onClick={goBack}>
                      Back
                    </Button>
                    <div className="flex flex-col items-end gap-1.5">
                      <Button type="button" onClick={handleFinish} disabled={finishing}>
                        {finishing ? "Finishing..." : "Finish setup"}
                      </Button>
                      {finishError && <span className="text-xs text-destructive">{finishError}</span>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col">
                  <div className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">
                    {current.section}
                  </div>
                  <h2 className="mb-2 font-serif text-[28px] font-normal tracking-[-0.01em] text-card-foreground">
                    {current.title}
                  </h2>
                  <p className="mb-8 text-[15.5px] leading-[1.6] text-muted-foreground">{current.subtitle}</p>

                  <div
                    className={
                      isolated
                        ? "flex flex-col gap-3"
                        : "grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5"
                    }
                  >
                    {(current.fields ?? []).map((field) => (
                      <div key={field.key} className="flex flex-col gap-2">
                        {field.label && (
                          <label className="text-sm font-semibold text-card-foreground">{field.label}</label>
                        )}
                        {field.type === "textarea" ? (
                          <Textarea
                            value={data[field.key] || ""}
                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setField(field, e.target.value)}
                            placeholder={field.placeholder}
                            rows={field.rows ?? 4}
                            className="resize-none"
                          />
                        ) : (
                          <Input
                            type="text"
                            value={data[field.key] || ""}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setField(field, e.target.value)}
                            placeholder={field.placeholder}
                            className="h-11"
                          />
                        )}
                        {field.helper && <div className="text-[13px] text-faint">{field.helper}</div>}
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-9">
                    {step > 0 ? (
                      <Button type="button" variant="secondary" onClick={goBack}>
                        Back
                      </Button>
                    ) : (
                      <div />
                    )}
                    <Button
                      type="button"
                      onClick={goNext}
                      disabled={!isStepComplete(current, data)}
                    >
                      {nextLabel}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
