"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";
import {
  OPTIONAL_RESPONDENT_FIELD_LABELS,
  slugifyCustomFieldKey,
  type CustomRespondentFieldDef,
} from "@/lib/surveys/respondent-fields";
import { slugify, randomSlugSuffix } from "@/lib/surveys/slugify";
import { SurveyOnboardingChat } from "@/components/SurveyOnboardingChat";
import type { ExtractedSurveyDetails } from "@/lib/survey-onboarding/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BirdLoader } from "@/components/BirdLoader";
import { useLoadingGate } from "@/components/useLoadingGate";
import { cn } from "@/lib/utils";

// Step order (design_handoff_survey_wizard_reorder): internal name and the
// survey's substance come first, respondent-facing fields (external name,
// public description) come after — so the name/description AI suggestions
// (below) have real survey details to draw from — then a review/finish step.
// Slug still immediately follows external name and is still auto-derived
// from it (see the effect below), just at its new position.
const STEP_INTERNAL_NAME = 0;
const STEP_SPONSOR = 1;
const STEP_DETAILS = 2;
const STEP_GIFT_CARD = 3;
const STEP_RESPONDENT_INFO = 4;
const STEP_EXTERNAL_NAME = 5;
const STEP_SLUG = 6;
const STEP_PUBLIC_DESCRIPTION = 7;
const STEP_REVIEW = 8;
const TOTAL_STEPS = 9;

const invalidBorder = "border-destructive focus-visible:ring-destructive";

function StepShell({
  label,
  required,
  optional,
  helper,
  hint,
  error,
  onBack,
  footer,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  helper?: string;
  hint?: string;
  error?: string | null;
  onBack?: () => void;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="self-start text-xs font-medium text-muted-foreground hover:text-card-foreground"
        >
          ← Back
        </button>
      ) : (
        <span className="h-4" />
      )}
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-card-foreground">
          {label}
          {required && <span className="text-destructive"> *</span>}
          {optional && <span className="ml-1.5 text-sm font-normal text-muted-foreground">optional</span>}
        </h2>
        {helper && <p className="text-sm text-muted-foreground">{helper}</p>}
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
      {footer}
    </div>
  );
}

function StepFooter({ onNext, nextLabel = "OK" }: { onNext: () => void; nextLabel?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Button type="button" onClick={onNext}>
        {nextLabel}
      </Button>
      <span className="text-xs text-muted-foreground">press Enter ↵</span>
    </div>
  );
}

function BackArrowIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path
        d="M13 8H3M7 3.5L2.5 8 7 12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      className={cn("shrink-0", spinning && "animate-spin")}
    >
      <path
        d="M13.5 8a5.5 5.5 0 11-1.6-3.9M13.5 2.5v2.6h-2.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Tappable name suggestions (3 pills, full-width stacked) shown above the
// external-name input. Tapping fills the input and marks that pill selected
// (design_handoff_create_survey); typing in the input deselects all of them
// (see the onChange handler below). Never advances the step on its own.
// Loads asynchronously the first time this step is reached; failures just
// leave the plain input with nothing above it, no error shown, since
// suggestions are a bonus and the input is always immediately usable.
function NameSuggestions({
  suggestions,
  loading,
  pickedIndex,
  onPick,
  onRegenerate,
}: {
  suggestions: string[] | null;
  loading: boolean;
  pickedIndex: number;
  onPick: (name: string, index: number) => void;
  onRegenerate: () => void;
}) {
  if (loading && !suggestions) {
    return (
      <div className="mb-3 flex flex-col gap-2.5">
        <Skeleton className="h-[46px] w-full rounded-[18px]" />
        <Skeleton className="h-[46px] w-full rounded-[18px]" />
        <Skeleton className="h-[46px] w-full rounded-[18px]" />
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <>
      <div className="mb-3 flex flex-col gap-2.5">
        {suggestions.map((name, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPick(name, i)}
            className={cn(
              "rounded-[18px] border border-indigo-chip/25 bg-indigo-chip/[0.07] px-[18px] py-[13px] text-left text-[15px] leading-[1.45] text-[hsl(243_75%_45%)] transition-[background,transform] duration-[130ms] ease-in-out hover:bg-indigo-chip/[0.12] active:scale-[.99]",
              i === pickedIndex && "border-transparent bg-indigo-chip/10 ring-2 ring-inset ring-indigo-chip"
            )}
          >
            {name}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onRegenerate}
        disabled={loading}
        className="mb-7 inline-flex items-center gap-[7px] text-[13.5px] font-medium text-muted-foreground hover:text-card-foreground"
      >
        <RefreshIcon spinning={loading} />
        Regenerate suggestions
      </button>
    </>
  );
}

// Single suggestion card for the public-description step. Same tap-to-fill,
// never-a-blocker behavior as NameSuggestions above.
function DescriptionSuggestion({
  suggestion,
  loading,
  onPick,
  onRegenerate,
}: {
  suggestion: string | null;
  loading: boolean;
  onPick: (text: string) => void;
  onRegenerate: () => void;
}) {
  if (loading && !suggestion) {
    return <Skeleton className="h-16 w-full rounded-card" />;
  }

  if (!suggestion) return null;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => onPick(suggestion)}
        className="rounded-card border border-indigo-chip/20 bg-indigo-chip/[0.08] p-3.5 text-left text-sm leading-[1.5] text-card-foreground transition-colors hover:bg-indigo-chip/[0.14]"
      >
        {suggestion}
      </button>
      <button
        type="button"
        onClick={onRegenerate}
        disabled={loading}
        className="self-start text-xs text-muted-foreground hover:text-card-foreground"
      >
        {loading ? "Regenerating..." : "Regenerate suggestion"}
      </button>
    </div>
  );
}

// Live mock of the respondent landing page — the NEW cream respondent UI
// (design_handoff_create_survey / see app/survey/[slug]/InterviewFlow.tsx
// for the real thing), so the admin can see what an external name or slug
// change actually looks like before creating the survey. This is a
// simplified, stylized preview card, not a literal re-render of
// InterviewFlow's own (more elaborate) welcome screen — same relationship
// the previous version of this panel had to the old design. Colors are the
// respondent-preview cream palette, kept as raw hex to match
// InterviewFlow.tsx's own precedent (that screen hardcodes these same
// values rather than routing them through --ds-* tokens, which are a
// separate, ink-based palette for the rest of the admin).
function SurveyPreviewPanel({
  externalTitle,
  slug,
  giftCardAmount,
}: {
  externalTitle: string;
  slug: string;
  giftCardAmount: string;
}) {
  // "-xxxxxx" stands in for the random anti-enumeration suffix that gets
  // appended at creation (see createSurvey) — the real value doesn't exist
  // yet, and previewing without any tail would promise a URL that's never
  // what actually gets created.
  const previewSlug = `${slugify(slug) || "birdsong-research"}-xxxxxx`;
  const previewTitle = externalTitle.trim() || "Your survey title";
  // Real domain, not a placeholder: NEXT_PUBLIC_APP_URL is the same env var
  // the lead-notification email/Slack links build from (lib/email/lead-notification.ts,
  // lib/slack/lead-notification.ts), so this preview matches the actual
  // link a respondent would get.
  const previewDomain = (process.env.NEXT_PUBLIC_APP_URL || "https://usebirdsong.com")
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");

  return (
    <div className="flex h-full flex-col">
      <span className="mb-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-faint">Preview</span>

      <div className="flex-none overflow-hidden rounded-card border border-border shadow-[0_8px_24px_rgba(0,0,0,.06)]">
        <div className="flex items-center gap-[7px] bg-[#f4f4f4] px-3.5 py-[11px]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#f26558]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#f5b52e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#38c25d]" />
          <div className="ml-1.5 flex-1 truncate rounded-control bg-white px-3 py-1.5 font-mono text-[11.5px] text-[#6b7280]">
            {previewDomain}/survey/{previewSlug}
          </div>
        </div>

        <div
          className="px-9 pb-[34px] pt-[38px]"
          style={{
            background:
              "radial-gradient(120% 80% at 50% -6%, rgba(233,166,116,.22), transparent 58%), #f3ecdf",
          }}
        >
          <div className="mx-auto flex max-w-[400px] flex-col">
            <div className="mb-3.5 flex items-center gap-2">
              {giftCardAmount && (
                <span className="rounded-full bg-success-bg px-[9px] py-1 text-[10.5px] font-bold tracking-[0.04em] text-success">
                  ${giftCardAmount} GIFT CARD
                </span>
              )}
              <span className="text-[11px] text-[#6f6757]">~10 minutes</span>
            </div>

            <div className="font-spectral mb-2.5 text-balance text-[25px] font-medium leading-[1.15] tracking-[-0.01em] text-[#262019]">
              {previewTitle}
            </div>
            <div className="mb-[22px] text-[12.5px] leading-[1.5] text-[#6f6757]">
              A few quick questions about how your team handles this today.
            </div>

            <div className="flex flex-col gap-2">
              <div className="rounded-[9px] border border-[#e7ddc9] bg-[#fffdf7] px-3 py-2.5 text-xs text-[#a89d88]">
                Your name
              </div>
              <div className="rounded-[9px] border border-[#e7ddc9] bg-[#fffdf7] px-3 py-2.5 text-xs text-[#a89d88]">
                Email
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[9px] border border-[#e7ddc9] bg-[#fffdf7] px-3 py-2.5 text-xs text-[#a89d88]">
                  Job title
                </div>
                <div className="rounded-[9px] border border-[#e7ddc9] bg-[#fffdf7] px-3 py-2.5 text-xs text-[#a89d88]">
                  Company
                </div>
              </div>
            </div>

            <div className="mt-3.5 flex items-center justify-center gap-2 rounded-[9px] bg-[#241f18] p-3 text-[13px] font-semibold text-[#f3ecdf]">
              Start
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2.5 8h11M9 3.5L13.5 8 9 12.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[10.5px] text-[#a89d88]">
              <svg width="11" height="11" viewBox="0 0 18 18" fill="none">
                <path
                  d="M4 11c0-3.3 2.7-6 6-6 .8 0 1.6.2 2.3.5-.5 2-2 3-3.8 3.2 1.6.5 3.3-.2 4.2-1.3.2.6.3 1.2.3 1.9 0 3-2.4 5.4-5.4 5.4S2 12.7 2 10"
                  stroke="#a89d88"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <circle cx="11.4" cy="7.4" r=".7" fill="#a89d88" />
              </svg>
              Powered by Birdsong
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 text-center text-[12.5px] text-faint">Updates as you type</div>
    </div>
  );
}

export function NewSurveyWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [title, setTitle] = useState("");
  const [externalTitle, setExternalTitle] = useState("");
  const [sponsor, setSponsor] = useState("");
  const [publicDescription, setPublicDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [giftCardAmount, setGiftCardAmount] = useState("");

  const [collectPhone, setCollectPhone] = useState(true);
  const [collectJobTitle, setCollectJobTitle] = useState(true);
  // Off by default: company is now derived from the required work email
  // domain instead of asked for directly. Admins can still turn this back
  // on for an explicit field, which then takes priority over the derived
  // name everywhere it's displayed or fed to the interview.
  const [collectCompany, setCollectCompany] = useState(false);
  const [phoneLabel, setPhoneLabel] = useState(OPTIONAL_RESPONDENT_FIELD_LABELS.phone);
  const [jobTitleLabel, setJobTitleLabel] = useState(OPTIONAL_RESPONDENT_FIELD_LABELS.job_title);
  const [companyLabel, setCompanyLabel] = useState(OPTIONAL_RESPONDENT_FIELD_LABELS.company);
  const [phoneRequired, setPhoneRequired] = useState(false);
  const [jobTitleRequired, setJobTitleRequired] = useState(false);
  const [companyRequired, setCompanyRequired] = useState(false);
  const [customFields, setCustomFields] = useState<CustomRespondentFieldDef[]>([]);
  const [newCustomFieldLabel, setNewCustomFieldLabel] = useState("");
  const [newCustomFieldRequired, setNewCustomFieldRequired] = useState(false);

  const [titleError, setTitleError] = useState(false);
  const [externalTitleError, setExternalTitleError] = useState(false);
  const [slugError, setSlugError] = useState(false);

  const [extractedDetails, setExtractedDetails] = useState<ExtractedSurveyDetails | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const showCreateLoader = useLoadingGate(creating);

  const [nameSuggestions, setNameSuggestions] = useState<string[] | null>(null);
  const [nameSuggestionsLoading, setNameSuggestionsLoading] = useState(false);
  // Index into nameSuggestions the admin has tapped, or -1 once they've
  // typed anything of their own (design_handoff_create_survey: picking a
  // pill marks it selected; typing deselects all of them).
  const [pickedSuggestionIndex, setPickedSuggestionIndex] = useState(-1);
  const externalNameInputRef = useRef<HTMLInputElement>(null);
  const [descriptionSuggestion, setDescriptionSuggestion] = useState<string | null>(null);
  const [descriptionSuggestionLoading, setDescriptionSuggestionLoading] = useState(false);

  // Chat-to-next-step transition (research guide chat completing into the
  // gift card step). Reuses CompanyProfileSetupFlow's step-advance transition
  // (opacity + translateY(8px), 260ms ease-out) rather than inventing a new
  // one; `chatExiting` runs the same motion in reverse for the outgoing chat
  // panel. Scoped to just this one handoff, not every step change, since
  // that's the only transition reported as abrupt.
  const [chatExiting, setChatExiting] = useState(false);
  const [entering, setEntering] = useState(false);
  const giftCardInputRef = useRef<HTMLInputElement>(null);
  // Suppresses the effect below during the animated handoff so focus lands
  // only once the enter transition finishes, not the instant the step mounts.
  const skipGiftCardAutoFocusRef = useRef(false);

  useEffect(() => {
    if (step === STEP_GIFT_CARD && !skipGiftCardAutoFocusRef.current) {
      giftCardInputRef.current?.focus();
    }
  }, [step]);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(externalTitle));
  }, [externalTitle, slugTouched]);

  async function fetchNameSuggestions() {
    if (!extractedDetails) return;
    setNameSuggestionsLoading(true);
    setNameSuggestions(null);
    setPickedSuggestionIndex(-1);
    try {
      const res = await fetch("/api/surveys/suggest-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ details: extractedDetails }),
      });
      if (!res.ok) throw new Error("Failed to generate suggestions");
      const data = await res.json();
      setNameSuggestions(Array.isArray(data.titles) ? data.titles : null);
    } catch {
      // Suggestions are a bonus, never a blocker: fail quietly, the input
      // stays fully usable with nothing above it.
      setNameSuggestions(null);
    } finally {
      setNameSuggestionsLoading(false);
    }
  }

  async function fetchDescriptionSuggestion() {
    if (!extractedDetails || !externalTitle.trim()) return;
    setDescriptionSuggestionLoading(true);
    setDescriptionSuggestion(null);
    try {
      const res = await fetch("/api/surveys/suggest-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ details: extractedDetails, externalTitle }),
      });
      if (!res.ok) throw new Error("Failed to generate a suggestion");
      const data = await res.json();
      setDescriptionSuggestion(typeof data.description === "string" ? data.description : null);
    } catch {
      setDescriptionSuggestion(null);
    } finally {
      setDescriptionSuggestionLoading(false);
    }
  }

  // Fire once when each step is first reached (not on every render — keyed
  // only on `step`), per the "suggestions load asynchronously when the step
  // is reached" placement rule. The description suggestion deliberately
  // waits for extractedDetails AND externalTitle, since it's generated from
  // the actual chosen name, which may differ from any name suggestion.
  useEffect(() => {
    if (step === STEP_EXTERNAL_NAME && !nameSuggestions && !nameSuggestionsLoading && extractedDetails) {
      fetchNameSuggestions();
    }
    if (
      step === STEP_PUBLIC_DESCRIPTION &&
      !descriptionSuggestion &&
      !descriptionSuggestionLoading &&
      extractedDetails
    ) {
      fetchDescriptionSuggestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const titleInvalid = titleError && !title.trim();
  const externalTitleInvalid = externalTitleError && !externalTitle.trim();
  const slugInvalid = slugError && !slugify(slug);

  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  function goNext() {
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  }

  function handleTitleNext() {
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    goNext();
  }

  function handleExternalTitleNext() {
    if (!externalTitle.trim()) {
      setExternalTitleError(true);
      externalNameInputRef.current?.focus();
      return;
    }
    goNext();
  }

  function handleSlugNext() {
    if (!slugify(slug)) {
      setSlugError(true);
      return;
    }
    goNext();
  }

  function handleEnterKey(e: KeyboardEvent<HTMLElement>, onNext: () => void) {
    if (e.key === "Enter") {
      e.preventDefault();
      onNext();
    }
  }

  function addCustomField() {
    const label = newCustomFieldLabel.trim();
    if (!label) return;

    const baseKey = slugifyCustomFieldKey(label);
    let key = baseKey;
    let suffix = 2;
    while (customFields.some((field) => field.key === key)) {
      key = `${baseKey}_${suffix}`;
      suffix += 1;
    }

    setCustomFields((prev) => [...prev, { key, label, required: newCustomFieldRequired }]);
    setNewCustomFieldLabel("");
    setNewCustomFieldRequired(false);
  }

  function removeCustomField(key: string) {
    setCustomFields((prev) => prev.filter((field) => field.key !== key));
  }

  function toggleCustomFieldRequired(key: string) {
    setCustomFields((prev) =>
      prev.map((field) => (field.key === key ? { ...field, required: !field.required } : field))
    );
  }

  async function createSurvey(extracted: ExtractedSurveyDetails) {
    setCreateError(null);
    setCreating(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const enabledFields: CustomRespondentFieldDef[] = [
        ...(collectPhone
          ? [
              {
                key: "phone",
                label: phoneLabel.trim() || OPTIONAL_RESPONDENT_FIELD_LABELS.phone,
                required: phoneRequired,
              },
            ]
          : []),
        ...(collectJobTitle
          ? [
              {
                key: "job_title",
                label: jobTitleLabel.trim() || OPTIONAL_RESPONDENT_FIELD_LABELS.job_title,
                required: jobTitleRequired,
              },
            ]
          : []),
        ...(collectCompany
          ? [
              {
                key: "company",
                label: companyLabel.trim() || OPTIONAL_RESPONDENT_FIELD_LABELS.company,
                required: companyRequired,
              },
            ]
          : []),
      ];

      const payload = {
        title,
        external_title: externalTitle,
        sponsor: sponsor || null,
        public_description: publicDescription || null,
        topic: extracted.topic || null,
        target_industry: extracted.targetIndustry || null,
        target_job_title: extracted.targetJobTitle || null,
        target_company_size: extracted.targetCompanySize || null,
        question_guide: extracted.questionGuide || null,
        tone: extracted.tone || null,
        num_questions: extracted.numQuestions ? Number(extracted.numQuestions) : null,
        gift_card_amount: giftCardAmount ? Number(giftCardAmount) : null,
        // Presets stay bare strings; admin-defined fields are {key, label}
        // objects in the same array, see lib/surveys/respondent-fields.ts.
        custom_fields: [...enabledFields, ...customFields] as Json,
      };

      // Every new survey's public slug ends in a random suffix so slugs
      // can't be enumerated across sponsors; it also makes collisions
      // effectively impossible, but the DB's surveys_slug_key constraint is
      // still the backstop — on the off-chance 23505 fires anyway, retry
      // with a freshly generated suffix (not a predictable increment).
      const baseSlug = slugify(slug);
      let candidateSlug = `${baseSlug}-${randomSlugSuffix()}`;
      let attempt = 1;
      let resultId: string | null = null;

      while (attempt <= 5) {
        const { data, error: dbError } = await supabase
          .from("surveys")
          .insert({ ...payload, slug: candidateSlug, user_id: user.id })
          .select("id")
          .single();

        if (!dbError) {
          resultId = data.id;
          break;
        }

        if (dbError.code === "23505") {
          attempt += 1;
          candidateSlug = `${baseSlug}-${randomSlugSuffix()}`;
          continue;
        }

        throw dbError;
      }

      if (!resultId) {
        throw new Error("Couldn't find an available slug, try editing it manually.");
      }

      router.push(`/admin/surveys/${resultId}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Something went wrong");
      setCreating(false);
    }
  }

  // Details captured, but survey creation now waits for the review step —
  // the admin still has external name, slug, and public description ahead.
  // Sequenced so the chat doesn't just vanish: pause so the final AI message
  // is readable, fade the chat out, advance the step (progress bar included),
  // fade the gift card step in, then focus its input once that's settled —
  // never while still animating in.
  function handleDetailsGenerated(extracted: ExtractedSurveyDetails) {
    setExtractedDetails(extracted);

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      goNext();
      return;
    }

    skipGiftCardAutoFocusRef.current = true;
    window.setTimeout(() => {
      setChatExiting(true);
      window.setTimeout(() => {
        goNext();
        setChatExiting(false);
        setEntering(true);
        requestAnimationFrame(() => requestAnimationFrame(() => setEntering(false)));
        window.setTimeout(() => {
          giftCardInputRef.current?.focus();
          skipGiftCardAutoFocusRef.current = false;
        }, 260);
      }, 260);
    }, 300);
  }

  const progressPercent = ((step + 1) / TOTAL_STEPS) * 100;
  const showPreview = step === STEP_SLUG || step === STEP_REVIEW;

  // Full-bleed two-pane layout (design_handoff_create_survey), cancelling
  // AdminShell's p-8 the same way CompanyProfileSetupFlow does for its own
  // full-bleed step rail — this step alone gets the pixel-perfect handoff
  // treatment; every other step keeps the plain boxed layout below.
  if (step === STEP_EXTERNAL_NAME) {
    return (
      <div className="-m-8 flex h-screen overflow-hidden">
        <div className="flex-[1_1_55%] overflow-auto bg-page">
          <div className="mx-auto max-w-[640px] px-7 py-7">
            <div className="rounded-card border border-border bg-card px-11 pb-10 pt-9 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
              <div className="mb-7 flex items-center justify-between gap-3.5">
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex items-center gap-[7px] text-sm font-medium text-muted-foreground hover:underline"
                >
                  <BackArrowIcon />
                  Back
                </button>
                <span className="text-xs font-medium text-faint">
                  Step {step + 1} of {TOTAL_STEPS}
                </span>
              </div>

              <div className="bs-rise-repeat">
                <h1 className="mb-2 text-[26px] font-semibold leading-[1.2] tracking-[-0.015em] text-card-foreground">
                  External name<span className="text-destructive"> *</span>
                </h1>
                <p className="mb-6 text-[15px] leading-[1.55] text-muted-foreground">
                  Shown to respondents on the interview page itself.
                </p>

                <NameSuggestions
                  suggestions={nameSuggestions}
                  loading={nameSuggestionsLoading}
                  pickedIndex={pickedSuggestionIndex}
                  onPick={(name, i) => {
                    setExternalTitle(name);
                    setPickedSuggestionIndex(i);
                  }}
                  onRegenerate={fetchNameSuggestions}
                />

                <Input
                  ref={externalNameInputRef}
                  autoFocus
                  type="text"
                  value={externalTitle}
                  onChange={(e) => {
                    setExternalTitle(e.target.value);
                    setPickedSuggestionIndex(-1);
                  }}
                  onKeyDown={(e) => handleEnterKey(e, handleExternalTitleNext)}
                  placeholder="How Demand Generation Leaders…"
                  className={cn(
                    "mb-5 h-auto rounded-control px-[15px] py-[13px] text-[16px] focus-visible:border-indigo-chip focus-visible:ring-indigo-chip/15 focus-visible:ring-offset-0",
                    externalTitleInvalid && invalidBorder
                  )}
                />
                {externalTitleInvalid && (
                  <span className="-mt-3 mb-3 block text-xs text-destructive">Required</span>
                )}

                <div className="flex items-center gap-3.5">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleExternalTitleNext}
                    className="h-auto px-[26px] py-[11px] text-[15px] font-semibold active:scale-[.98]"
                  >
                    OK
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    press <span className="font-semibold text-card-foreground">Enter ↵</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-[1_1_45%] overflow-auto border-l border-border px-8 py-7">
          <SurveyPreviewPanel externalTitle={externalTitle} slug={slug} giftCardAmount={giftCardAmount} />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container flex flex-col items-center gap-7">
      <div className="flex w-full flex-col gap-2 self-start">
        <span className="type-label">Surveys</span>
        <h1 className="type-page-title">New survey</h1>
      </div>
      <div className={cn("flex w-full flex-col gap-6", showPreview ? "max-w-3xl" : "max-w-xl")}>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className={showPreview ? "grid grid-cols-1 gap-8 md:grid-cols-2 md:items-start" : undefined}>
          <div
          className="rounded-card border border-border bg-card p-8 transition-all duration-[260ms] ease-out"
          style={{
            opacity: entering ? 0 : 1,
            transform: entering ? "translateY(8px)" : "translateY(0)",
          }}
        >
          {step === STEP_INTERNAL_NAME && (
            <StepShell
              label="Internal name"
              required
              helper="For your own reference in the admin dashboard. Respondents never see this."
              error={titleInvalid ? "Required" : null}
              footer={<StepFooter onNext={handleTitleNext} />}
            >
              <Input
                autoFocus
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => handleEnterKey(e, handleTitleNext)}
                className={titleInvalid ? invalidBorder : ""}
              />
            </StepShell>
          )}

          {step === STEP_SPONSOR && (
            <StepShell
              label="Sponsor or company name"
              hint="This is probably just your company's name."
              onBack={goBack}
              footer={<StepFooter onNext={goNext} />}
            >
              <Input
                autoFocus
                type="text"
                value={sponsor}
                onChange={(e) => setSponsor(e.target.value)}
                onKeyDown={(e) => handleEnterKey(e, goNext)}
                placeholder="Who this research is conducted on behalf of"
              />
            </StepShell>
          )}

          {step === STEP_DETAILS && (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={goBack}
                className="self-start text-xs font-medium text-muted-foreground hover:text-card-foreground"
              >
                ← Back
              </button>
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-card-foreground">Survey details</h2>
                <p className="text-sm text-muted-foreground">
                  Research theme, target audience, tone, question count, and the question guide.
                </p>
              </div>

              {extractedDetails ? (
                <div className="flex flex-col gap-4">
                  <div className="rounded-control border border-border bg-secondary/40 p-3 text-sm">
                    <p className="mb-1 font-medium text-card-foreground">
                      {extractedDetails.topic || "Topic captured"}
                    </p>
                    <p className="text-muted-foreground">
                      {[extractedDetails.targetJobTitle, extractedDetails.targetIndustry, extractedDetails.targetCompanySize]
                        .filter(Boolean)
                        .join(" · ") || "Audience captured"}
                    </p>
                  </div>
                  <StepFooter onNext={goNext} />
                </div>
              ) : (
                <div
                  className="transition-all duration-[260ms] ease-out"
                  style={{
                    opacity: chatExiting ? 0 : 1,
                    transform: chatExiting ? "translateY(-8px)" : "translateY(0)",
                  }}
                >
                  <SurveyOnboardingChat onComplete={handleDetailsGenerated} />
                </div>
              )}
            </div>
          )}

          {step === STEP_GIFT_CARD && (
            <StepShell
              label="Gift card amount ($)"
              optional
              onBack={goBack}
              footer={<StepFooter onNext={goNext} />}
            >
              <Input
                ref={giftCardInputRef}
                type="number"
                min="0"
                value={giftCardAmount}
                onChange={(e) => setGiftCardAmount(e.target.value)}
                onKeyDown={(e) => handleEnterKey(e, goNext)}
              />
            </StepShell>
          )}

          {step === STEP_RESPONDENT_INFO && (
            <StepShell
              label="Respondent info"
              optional
              helper="Name and email are always collected."
              onBack={goBack}
              footer={<StepFooter onNext={goNext} />}
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-sm text-card-foreground">
                    <input
                      autoFocus
                      type="checkbox"
                      checked={collectPhone}
                      onChange={(e) => setCollectPhone(e.target.checked)}
                      onKeyDown={(e) => handleEnterKey(e, goNext)}
                      className="accent-primary"
                    />
                    <Input
                      type="text"
                      value={phoneLabel}
                      onChange={(e) => setPhoneLabel(e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, goNext)}
                      className="h-7 flex-1 text-sm"
                    />
                    <label className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={phoneRequired}
                        onChange={(e) => setPhoneRequired(e.target.checked)}
                        onKeyDown={(e) => handleEnterKey(e, goNext)}
                        disabled={!collectPhone}
                        className="accent-primary"
                      />
                      Required
                    </label>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-card-foreground">
                    <input
                      type="checkbox"
                      checked={collectJobTitle}
                      onChange={(e) => setCollectJobTitle(e.target.checked)}
                      onKeyDown={(e) => handleEnterKey(e, goNext)}
                      className="accent-primary"
                    />
                    <Input
                      type="text"
                      value={jobTitleLabel}
                      onChange={(e) => setJobTitleLabel(e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, goNext)}
                      className="h-7 flex-1 text-sm"
                    />
                    <label className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={jobTitleRequired}
                        onChange={(e) => setJobTitleRequired(e.target.checked)}
                        onKeyDown={(e) => handleEnterKey(e, goNext)}
                        disabled={!collectJobTitle}
                        className="accent-primary"
                      />
                      Required
                    </label>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-card-foreground">
                    <input
                      type="checkbox"
                      checked={collectCompany}
                      onChange={(e) => setCollectCompany(e.target.checked)}
                      onKeyDown={(e) => handleEnterKey(e, goNext)}
                      className="accent-primary"
                    />
                    <Input
                      type="text"
                      value={companyLabel}
                      onChange={(e) => setCompanyLabel(e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, goNext)}
                      className="h-7 flex-1 text-sm"
                    />
                    <label className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={companyRequired}
                        onChange={(e) => setCompanyRequired(e.target.checked)}
                        onKeyDown={(e) => handleEnterKey(e, goNext)}
                        disabled={!collectCompany}
                        className="accent-primary"
                      />
                      Required
                    </label>
                  </div>
                </div>

                {customFields.length > 0 && (
                  <div className="flex flex-col gap-1.5 border-t border-border pt-2">
                    {customFields.map((field) => (
                      <div
                        key={field.key}
                        className="flex items-center justify-between gap-2 text-sm text-card-foreground"
                      >
                        <span>{field.label}</span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1 text-xs text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={field.required === true}
                              onChange={() => toggleCustomFieldRequired(field.key)}
                              className="accent-primary"
                            />
                            Required
                          </label>
                          <button
                            type="button"
                            onClick={() => removeCustomField(field.key)}
                            className="text-xs text-muted-foreground hover:text-destructive"
                            aria-label={`Remove ${field.label}`}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 border-t border-border pt-2">
                  <Input
                    type="text"
                    value={newCustomFieldLabel}
                    onChange={(e) => setNewCustomFieldLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomField();
                      }
                    }}
                    placeholder="Custom field, e.g. Team size"
                    className="h-8 text-sm"
                  />
                  <label className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={newCustomFieldRequired}
                      onChange={(e) => setNewCustomFieldRequired(e.target.checked)}
                      className="accent-primary"
                    />
                    Required
                  </label>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addCustomField}
                    disabled={!newCustomFieldLabel.trim()}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </StepShell>
          )}

          {step === STEP_SLUG && (
            <StepShell
              label="Slug"
              required
              helper="/survey/..."
              error={slugInvalid ? "Required" : null}
              onBack={goBack}
              footer={<StepFooter onNext={handleSlugNext} />}
            >
              <Input
                autoFocus
                type="text"
                value={slug}
                placeholder={slugify(externalTitle)}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                onKeyDown={(e) => handleEnterKey(e, handleSlugNext)}
                className={`font-mono text-sm ${slugInvalid ? invalidBorder : ""}`}
              />
              <span className="text-xs text-muted-foreground">{`/survey/${slugify(slug) || "..."}-xxxxxx`}</span>
            </StepShell>
          )}

          {step === STEP_PUBLIC_DESCRIPTION && (
            <StepShell
              label="Public description"
              optional
              hint="Shown to respondents on the survey landing page. Keep it neutral and research-framed. Never mention selling, pain points, or the sponsor's sales goals."
              onBack={goBack}
              footer={<StepFooter onNext={goNext} />}
            >
              <DescriptionSuggestion
                suggestion={descriptionSuggestion}
                loading={descriptionSuggestionLoading}
                onPick={setPublicDescription}
                onRegenerate={fetchDescriptionSuggestion}
              />
              <Textarea
                autoFocus
                value={publicDescription}
                onChange={(e) => setPublicDescription(e.target.value)}
                rows={3}
                placeholder="A short, neutral summary of what this conversation is about."
              />
            </StepShell>
          )}

          {step === STEP_REVIEW && (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={goBack}
                className="self-start text-xs font-medium text-muted-foreground hover:text-card-foreground"
              >
                ← Back
              </button>
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-card-foreground">Everything look right?</h2>
                <p className="text-sm text-muted-foreground">Go back to any step to change something.</p>
              </div>

              <div className="flex flex-col gap-2 rounded-control border border-border p-4 text-sm">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="shrink-0 text-muted-foreground">Internal name</span>
                  <span className="text-right text-card-foreground">{title || "—"}</span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="shrink-0 text-muted-foreground">Sponsor</span>
                  <span className="text-right text-card-foreground">{sponsor || "—"}</span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="shrink-0 text-muted-foreground">Topic</span>
                  <span className="text-right text-card-foreground">{extractedDetails?.topic || "—"}</span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="shrink-0 text-muted-foreground">Gift card</span>
                  <span className="text-right text-card-foreground">
                    {giftCardAmount ? `$${giftCardAmount}` : "None"}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="shrink-0 text-muted-foreground">External name</span>
                  <span className="text-right text-card-foreground">{externalTitle || "—"}</span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="shrink-0 text-muted-foreground">Slug</span>
                  <span className="text-right font-mono text-card-foreground">{slugify(slug) || "—"}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Public description</span>
                  <span className="text-left leading-[1.5] text-card-foreground">
                    {publicDescription || "Skipped"}
                  </span>
                </div>
              </div>

              {createError && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm text-destructive">{createError}</span>
                </div>
              )}

              <Button
                type="button"
                onClick={() => extractedDetails && createSurvey(extractedDetails)}
                disabled={creating || !extractedDetails}
              >
                {creating && showCreateLoader && <BirdLoader size={18} label={false} />}
                {creating ? "Creating..." : "Create survey"}
              </Button>
            </div>
          )}
        </div>
        {showPreview && <SurveyPreviewPanel externalTitle={externalTitle} slug={slug} giftCardAmount={giftCardAmount} />}
      </div>
      </div>
    </div>
  );
}
