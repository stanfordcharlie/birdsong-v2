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
import { BriefChat, type BriefResult } from "@/components/BriefChat";
import { GuideReview } from "@/components/GuideReview";
import { renderGuideToText, type StructuredGuide } from "@/lib/surveys/guide";
import type { ExtractedBrief } from "@/lib/brief/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { bricolage } from "@/lib/fonts";
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
// The brief chat, which replaces authoring a question guide by hand.
const STEP_BRIEF = 2;
// Reviewing and editing the guide it generated. Generation happens at the
// end of the brief; this step is where the admin decides anything about it.
const STEP_GUIDE = 3;
const STEP_GIFT_CARD = 4;
const STEP_RESPONDENT_INFO = 5;
const STEP_EXTERNAL_NAME = 6;
const STEP_SLUG = 7;
const STEP_PUBLIC_DESCRIPTION = 8;
const STEP_REVIEW = 9;
const TOTAL_STEPS = 10;

const invalidBorder = "border-destructive focus-visible:ring-destructive";

// The brief chat no longer asks for tone or question count: the guide's
// theme count IS the question count, and a peer-level research register is
// the only one the moderator prompt is written for. Both remain editable on
// the study afterwards through SurveyForm.
const DEFAULT_TONE = "Conversational";

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

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden>
      <path
        d="M11.2 2.3l2.5 2.5-7.6 7.6-3 .5.5-3 7.6-7.6z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Two-option segmented control, Optional / Required.
 *
 * Written here rather than reusing components/admin/ui/FilterTabs: this
 * wizard consumes components/ui, and DESIGN.md's import boundary keeps the
 * two primitive sets from reaching into each other.
 *
 * data-row-control marks it as a control that owns its own clicks, so the
 * surrounding row's click-to-toggle handler leaves it alone.
 */
function RequiredToggle({
  required,
  onChange,
  fieldLabel,
}: {
  required: boolean;
  onChange: (required: boolean) => void;
  fieldLabel: string;
}) {
  return (
    <div
      data-row-control
      role="group"
      aria-label={`Is ${fieldLabel} required?`}
      className="flex shrink-0 items-center gap-0.5 rounded-control bg-secondary p-0.5"
    >
      {[false, true].map((value) => (
        <button
          key={String(value)}
          type="button"
          aria-pressed={required === value}
          onClick={(e) => {
            e.stopPropagation();
            onChange(value);
          }}
          className={cn(
            "rounded-control px-2 py-0.5 text-xs font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            required === value
              ? "bg-card text-card-foreground shadow-sm"
              : "text-muted-foreground hover:text-card-foreground"
          )}
        >
          {value ? "Required" : "Optional"}
        </button>
      ))}
    </div>
  );
}

/**
 * One optional respondent field: one row, one primary control.
 *
 * The row is the toggle — clicking anywhere that is not itself a control
 * includes or excludes the field. The checkbox stays in the markup rather
 * than being faked with a div, so the row is reachable and announced by a
 * keyboard and a screen reader.
 *
 * The label is plain text at rest. It IS editable and the edited value is
 * what gets written to surveys.custom_fields, so renaming is kept, just
 * folded behind the pencil instead of sitting in a permanent text input that
 * made every row look like a form field.
 */
function RespondentFieldRow({
  label,
  onLabelChange,
  included,
  onIncludedChange,
  required,
  onRequiredChange,
  onEnter,
  autoFocus,
}: {
  label: string;
  onLabelChange: (label: string) => void;
  included: boolean;
  onIncludedChange: (included: boolean) => void;
  required: boolean;
  onRequiredChange: (required: boolean) => void;
  onEnter: (e: KeyboardEvent<HTMLElement>) => void;
  autoFocus?: boolean;
}) {
  const [renaming, setRenaming] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) renameRef.current?.select();
  }, [renaming]);

  return (
    <div
      onClick={(e) => {
        if (renaming) return;
        // Anything marked as its own control handles its own click.
        if ((e.target as HTMLElement).closest("[data-row-control]")) return;
        onIncludedChange(!included);
      }}
      className={cn(
        "group flex cursor-pointer items-center gap-2.5 rounded-control border px-3 py-2 transition-colors",
        included ? "border-border bg-secondary/40" : "border-transparent hover:bg-secondary/40"
      )}
    >
      <input
        type="checkbox"
        data-row-control
        autoFocus={autoFocus}
        checked={included}
        onChange={(e) => onIncludedChange(e.target.checked)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onEnter}
        aria-label={`Collect ${label}`}
        className="accent-primary"
      />

      {renaming ? (
        <Input
          ref={renameRef}
          data-row-control
          type="text"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onBlur={() => setRenaming(false)}
          onKeyDown={(e) => {
            // Enter commits the rename rather than advancing the wizard:
            // finishing a field name is the nearer intent.
            if (e.key === "Enter" || e.key === "Escape") {
              e.preventDefault();
              setRenaming(false);
            }
          }}
          className="h-7 flex-1 text-sm"
        />
      ) : (
        <>
          <span className="flex-1 truncate text-sm text-card-foreground">{label}</span>
          <button
            type="button"
            data-row-control
            onClick={(e) => {
              e.stopPropagation();
              setRenaming(true);
            }}
            aria-label={`Rename ${label}`}
            className={cn(
              "shrink-0 rounded-control p-1 text-muted-foreground opacity-0 transition-opacity",
              "hover:text-card-foreground focus-visible:opacity-100 focus-visible:outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
            )}
          >
            <PencilIcon />
          </button>
        </>
      )}

      {included && (
        <RequiredToggle required={required} onChange={onRequiredChange} fieldLabel={label} />
      )}
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

/**
 * The optional respondent fields, in the order the real intake form renders
 * them. One builder, used both by the preview below and by createSurvey's
 * payload, so the two cannot drift: previewing a field set that differs from
 * the one actually written is the bug this replaced.
 */
function buildEnabledFieldDefs(args: {
  collectPhone: boolean;
  phoneLabel: string;
  phoneRequired: boolean;
  collectJobTitle: boolean;
  jobTitleLabel: string;
  jobTitleRequired: boolean;
  collectCompany: boolean;
  companyLabel: string;
  companyRequired: boolean;
}): CustomRespondentFieldDef[] {
  return [
    ...(args.collectPhone
      ? [
          {
            key: "phone",
            label: args.phoneLabel.trim() || OPTIONAL_RESPONDENT_FIELD_LABELS.phone,
            required: args.phoneRequired,
          },
        ]
      : []),
    ...(args.collectJobTitle
      ? [
          {
            key: "job_title",
            label: args.jobTitleLabel.trim() || OPTIONAL_RESPONDENT_FIELD_LABELS.job_title,
            required: args.jobTitleRequired,
          },
        ]
      : []),
    ...(args.collectCompany
      ? [
          {
            key: "company",
            label: args.companyLabel.trim() || OPTIONAL_RESPONDENT_FIELD_LABELS.company,
            required: args.companyRequired,
          },
        ]
      : []),
  ];
}

function PreviewField({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-survey-ink">{label}</span>
      <span className="block rounded-[14px] border border-survey-border bg-survey-surface px-4 py-3 text-[15px] text-survey-faint">
        {placeholder}
      </span>
    </div>
  );
}

/**
 * Live mock of the respondent intake form (the `intro` stage of
 * app/survey/[slug]/InterviewFlow.tsx), so the admin can see what a title,
 * description, slug or field change actually looks like before creating.
 *
 * It is scoped `.survey-theme` and paints itself from the respondent --sv-*
 * tokens rather than copying their values. It used to hold a hand-copied
 * palette, which had since drifted: the card fill was #f3ecdf against the
 * real #faf8f1, and that beige (plus a warm radial wash lifted from
 * LoadingScreen) is what made the preview look like a different product.
 * Reading the tokens is what stops that happening again. Admin normally must
 * not reach into --sv-*; this panel is the deliberate exception, because
 * being a faithful copy of that surface is its entire job.
 *
 * Still not a re-render of the real component: it draws the intro stage
 * only, so the welcome beat that precedes it (gift card starburst, question
 * count and timing, interviewer bubble, consent line) is not shown. See the
 * note in the report for what rendering the real component would take.
 */
function SurveyPreviewPanel({
  externalTitle,
  slug,
  publicDescription,
  enabledFields,
  customFields,
}: {
  externalTitle: string;
  slug: string;
  publicDescription: string;
  enabledFields: CustomRespondentFieldDef[];
  customFields: CustomRespondentFieldDef[];
}) {
  // "-xxxxxx" stands in for the random anti-enumeration suffix that gets
  // appended at creation (see createSurvey) — the real value doesn't exist
  // yet, and previewing without any tail would promise a URL that's never
  // what actually gets created.
  const previewSlug = `${slugify(slug) || "your-title"}-xxxxxx`;
  const previewTitle = externalTitle.trim() || "Your title here";

  // The same origin-on-mount trick SurveyUrl and CopySurveyLinkButton use,
  // rather than NEXT_PUBLIC_APP_URL: that var is only set in production, so
  // it silently previewed the wrong host everywhere else. This shows the
  // exact origin the admin's own copy-link buttons produce.
  const [origin, setOrigin] = useState("https://www.usebirdsong.com");
  useEffect(() => setOrigin(window.location.origin), []);

  const optionalFields = [...enabledFields, ...customFields];
  const jobTitle = optionalFields.find((f) => f.key === "job_title");
  const company = optionalFields.find((f) => f.key === "company");
  const sideBySide = Boolean(jobTitle && company);
  const rest = optionalFields.filter((f) =>
    sideBySide ? f.key !== "job_title" && f.key !== "company" : true
  );
  const fieldLabel = (f: CustomRespondentFieldDef) => (f.required ? `${f.label} *` : f.label);

  return (
    <div className="flex h-full flex-col">
      <span className="mb-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-faint">Preview</span>

      <div className="flex-none overflow-hidden rounded-card border border-border shadow-[0_8px_24px_rgba(0,0,0,.06)]">
        <div className="flex items-center gap-[7px] bg-secondary px-3.5 py-[11px]">
          <span className="h-2.5 w-2.5 rounded-full bg-faint/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-faint/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-faint/60" />
          <div className="ml-1.5 flex-1 truncate rounded-control bg-card px-3 py-1.5 font-mono text-[11.5px] text-muted-foreground">
            {origin}/survey/{previewSlug}
          </div>
        </div>

        <div className={cn("survey-theme bg-survey-ground px-7 pb-8 pt-9 font-sans", bricolage.variable)}>
          <div className="mx-auto flex max-w-[420px] flex-col">
            <h3 className="text-balance font-bricolage text-[27px] font-bold leading-[1.05] tracking-[-0.025em] text-survey-ink">
              {previewTitle}
            </h3>

            {publicDescription.trim() && (
              <p className="mt-4 text-[15px] leading-[1.6] text-survey-muted">{publicDescription}</p>
            )}

            <div className="mt-7 flex flex-col gap-3">
              <PreviewField label="Your name" placeholder="First and last" />
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-survey-ink">Work email</span>
                <span className="text-[13px] leading-[1.5] text-survey-muted">
                  This is where we&apos;ll send your gift card and a copy of the report.
                </span>
                <span className="block rounded-[14px] border border-survey-border bg-survey-surface px-4 py-3 text-[15px] text-survey-faint">
                  you@yourcompany.com
                </span>
              </div>

              {sideBySide && jobTitle && company && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <PreviewField label={fieldLabel(jobTitle)} placeholder={jobTitle.label} />
                  <PreviewField label={fieldLabel(company)} placeholder={company.label} />
                </div>
              )}

              {rest.map((f) => (
                <PreviewField key={f.key} label={fieldLabel(f)} placeholder={f.label} />
              ))}
            </div>

            <span className="mt-7 inline-flex w-fit items-center gap-3 rounded-full bg-survey-ink px-[26px] py-3.5 text-[16.5px] font-semibold text-survey-ground">
              Start
              <svg width="20" height="12" viewBox="0 0 22 12" fill="none" aria-hidden>
                <path
                  d="M1 6h19M15.5 1L20.5 6l-5 5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            <div className="mt-8 flex items-center gap-[7px]">
              <span className="text-[13.5px] text-survey-faint">Powered by</span>
              <svg width="17" height="15" viewBox="0 0 18 18" fill="none" aria-hidden>
                <path
                  d="M4 11c0-3.3 2.7-6 6-6 .8 0 1.6.2 2.3.5-.5 2-2 3-3.8 3.2 1.6.5 3.3-.2 4.2-1.3.2.6.3 1.2.3 1.9 0 3-2.4 5.4-5.4 5.4S2 12.7 2 10"
                  stroke="currentColor"
                  className="text-survey-ink"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <circle cx="11.4" cy="7.4" r=".7" className="fill-survey-ink" />
              </svg>
              <span className="font-bricolage text-[15px] font-bold text-survey-ink">Birdsong</span>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-[12.5px] text-faint">
        Updates as you type. Respondents see a welcome screen with the gift card and timing before
        this form.
      </p>
    </div>
  );
}

export function NewSurveyWizard({ orgId }: { orgId: string }) {
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

  // One source of truth for the optional field set: the preview renders it
  // and createSurvey writes it, so what the admin previewed is exactly what
  // lands in surveys.custom_fields.
  const previewEnabledFields = buildEnabledFieldDefs({
    collectPhone,
    phoneLabel,
    phoneRequired,
    collectJobTitle,
    jobTitleLabel,
    jobTitleRequired,
    collectCompany,
    companyLabel,
    companyRequired,
  });
  const [newCustomFieldLabel, setNewCustomFieldLabel] = useState("");

  const [titleError, setTitleError] = useState(false);
  const [externalTitleError, setExternalTitleError] = useState(false);
  const [slugError, setSlugError] = useState(false);

  // The brief chat's output. `brief` is the raw intake, `guide` is the
  // editable structured guide (seeded from what generation returned, then
  // owned by the review step), `transcript` is stored on the study so the
  // guide can be regenerated from the same intake later.
  const [brief, setBrief] = useState<ExtractedBrief | null>(null);
  const [guide, setGuide] = useState<StructuredGuide | null>(null);
  const [briefTranscript, setBriefTranscript] = useState<BriefResult["transcript"] | null>(null);
  const [regeneratingGuide, setRegeneratingGuide] = useState(false);

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

  // Chat-to-next-step transition (the brief chat completing into the guide
  // review step). Reuses CompanyProfileSetupFlow's step-advance transition
  // (opacity + translateY(8px), 260ms ease-out) rather than inventing a new
  // one; `chatExiting` runs the same motion in reverse for the outgoing chat
  // panel. Scoped to just this one handoff, not every step change, since
  // that's the only transition reported as abrupt.
  const [chatExiting, setChatExiting] = useState(false);
  const [entering, setEntering] = useState(false);
  const giftCardInputRef = useRef<HTMLInputElement>(null);

  // The suppress-focus-during-the-handoff ref this used to carry is gone
  // with the handoff itself: the chat now hands off to the guide review
  // step, and reaching the gift card step from there is an ordinary step
  // change with nothing animating over it.
  useEffect(() => {
    if (step === STEP_GIFT_CARD) giftCardInputRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(externalTitle));
  }, [externalTitle, slugTouched]);

  // The name and description suggestion endpoints were built against the old
  // extraction shape, which is unchanged. Mapping the brief onto it here
  // keeps both of those steps working without touching either route.
  const suggestionDetails =
    brief && guide
      ? {
          topic: guide.recommended_topic || brief.publicTopic,
          targetIndustry: brief.icpIndustry,
          targetJobTitle: brief.icpRoles,
          targetCompanySize: brief.icpCompanyProfile,
          tone: DEFAULT_TONE,
        }
      : null;

  async function fetchNameSuggestions() {
    if (!suggestionDetails) return;
    setNameSuggestionsLoading(true);
    setNameSuggestions(null);
    setPickedSuggestionIndex(-1);
    try {
      const res = await fetch("/api/surveys/suggest-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ details: suggestionDetails }),
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
    if (!suggestionDetails || !externalTitle.trim()) return;
    setDescriptionSuggestionLoading(true);
    setDescriptionSuggestion(null);
    try {
      const res = await fetch("/api/surveys/suggest-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ details: suggestionDetails, externalTitle }),
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
    if (step === STEP_EXTERNAL_NAME && !nameSuggestions && !nameSuggestionsLoading && suggestionDetails) {
      fetchNameSuggestions();
    }
    if (
      step === STEP_PUBLIC_DESCRIPTION &&
      !descriptionSuggestion &&
      !descriptionSuggestionLoading &&
      suggestionDetails
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

    // Optional by default; the row's Optional/Required control adjusts it
    // after the field exists. Same {key, label, required} shape as before.
    setCustomFields((prev) => [...prev, { key, label, required: false }]);
    setNewCustomFieldLabel("");
  }

  function removeCustomField(key: string) {
    setCustomFields((prev) => prev.filter((field) => field.key !== key));
  }

  function toggleCustomFieldRequired(key: string) {
    setCustomFields((prev) =>
      prev.map((field) => (field.key === key ? { ...field, required: !field.required } : field))
    );
  }

  async function createSurvey(finalBrief: ExtractedBrief, finalGuide: StructuredGuide) {
    setCreateError(null);
    setCreating(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const enabledFields = previewEnabledFields;

      const payload = {
        title,
        external_title: externalTitle,
        sponsor: sponsor || null,
        public_description: publicDescription || null,
        topic: finalGuide.recommended_topic || finalBrief.publicTopic || null,
        target_industry: finalBrief.icpIndustry || null,
        target_job_title: finalBrief.icpRoles || null,
        target_company_size: finalBrief.icpCompanyProfile || null,
        // The structured guide is the authored artifact; question_guide is
        // its text rendering. Both are written, and the text one is still
        // the only thing the interview runtime reads, unchanged.
        guide_structured: finalGuide as unknown as Json,
        question_guide: renderGuideToText(finalGuide) || null,
        brief_transcript: (briefTranscript ?? []) as unknown as Json,
        // Captured and stored. Nothing reads it in this build.
        qualification_criteria: finalBrief.qualificationCriteria || null,
        tone: DEFAULT_TONE,
        num_questions: finalGuide.themes.length,
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
          // user_id records who created the study; org_id is what scopes
          // it, and the surveys insert policy rejects a row whose org the
          // caller cannot write to.
          .insert({ ...payload, slug: candidateSlug, user_id: user.id, org_id: orgId })
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
  function handleGuideGenerated(result: BriefResult) {
    setBrief(result.brief);
    setGuide(result.guide);
    setBriefTranscript(result.transcript);

    // The guide's own recommendations seed the later steps rather than
    // replacing them: the admin can still change any of it, and the external
    // name step keeps its three alternatives.
    if (result.guide.recommended_title && !externalTitle.trim()) {
      setExternalTitle(result.guide.recommended_title);
    }
    if (result.guide.recommended_custom_fields.length > 0) {
      setCustomFields((prev) => {
        const existing = new Set(prev.map((f) => f.key));
        return [
          ...prev,
          ...result.guide.recommended_custom_fields
            .filter((f) => !existing.has(f.key))
            .map((f) => ({ key: f.key, label: f.label, required: false })),
        ];
      });
    }

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      goNext();
      return;
    }

    // Sequenced so the chat doesn't just vanish: pause so the closing
    // message is readable, fade the chat out, advance the step (progress bar
    // included), then fade the guide in.
    window.setTimeout(() => {
      setChatExiting(true);
      window.setTimeout(() => {
        goNext();
        setChatExiting(false);
        setEntering(true);
        requestAnimationFrame(() => requestAnimationFrame(() => setEntering(false)));
      }, 260);
    }, 300);
  }

  /**
   * Redraft the whole guide from the same brief. The transcript is kept, so
   * this never means running the chat again.
   */
  async function regenerateWholeGuide() {
    if (!brief) return;
    setRegeneratingGuide(true);
    try {
      const res = await fetch("/api/surveys/brief/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      const data = await res.json();
      if (res.ok) setGuide(data.guide);
    } finally {
      setRegeneratingGuide(false);
    }
  }

  const progressPercent = ((step + 1) / TOTAL_STEPS) * 100;
  const showPreview = step === STEP_SLUG || step === STEP_REVIEW;
  // The guide is four to six theme cards, each with five questions. At the
  // wizard's usual single-column width every question wraps to three lines
  // and the guide reads as a wall, so this one step gets the wider column
  // the preview steps already use.
  const wideStep = step === STEP_GUIDE;

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
          <SurveyPreviewPanel
            externalTitle={externalTitle}
            slug={slug}
            publicDescription={publicDescription}
            enabledFields={previewEnabledFields}
            customFields={customFields}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container flex flex-col items-center gap-7">
      <div className="flex w-full flex-col gap-2 self-start">
        <span className="type-label">Research</span>
        <h1 className="type-page-title">New study</h1>
      </div>
      <div
        className={cn(
          "flex w-full flex-col gap-6",
          showPreview || wideStep ? "max-w-3xl" : "max-w-xl"
        )}
      >
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

          {step === STEP_BRIEF && (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={goBack}
                className="self-start text-xs font-medium text-muted-foreground hover:text-card-foreground"
              >
                ← Back
              </button>
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-card-foreground">The brief</h2>
                <p className="text-sm leading-[1.5] text-muted-foreground">
                  A few questions about who you want to hear from and what you want to learn. Then
                  the research guide gets written for you.
                </p>
              </div>

              {brief && guide ? (
                <div className="flex flex-col gap-4">
                  <div className="rounded-control border border-border bg-secondary/40 p-3 text-sm">
                    <p className="mb-1 font-medium text-card-foreground">
                      {guide.recommended_topic || brief.publicTopic || "Brief captured"}
                    </p>
                    <p className="text-muted-foreground">
                      {[brief.icpRoles, brief.icpIndustry, brief.icpCompanyProfile]
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
                  <BriefChat
                    known={sponsor.trim() ? { sponsorName: sponsor.trim() } : undefined}
                    onGenerated={handleGuideGenerated}
                  />
                </div>
              )}
            </div>
          )}

          {step === STEP_GUIDE && guide && brief && (
            <GuideReview
              brief={brief}
              guide={guide}
              onChange={setGuide}
              onRegenerateAll={regenerateWholeGuide}
              regeneratingAll={regeneratingGuide}
              onBack={goBack}
              onContinue={goNext}
            />
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
                <div className="flex flex-col gap-1">
                  <RespondentFieldRow
                    autoFocus
                    label={phoneLabel}
                    onLabelChange={setPhoneLabel}
                    included={collectPhone}
                    onIncludedChange={setCollectPhone}
                    required={phoneRequired}
                    onRequiredChange={setPhoneRequired}
                    onEnter={(e) => handleEnterKey(e, goNext)}
                  />
                  <RespondentFieldRow
                    label={jobTitleLabel}
                    onLabelChange={setJobTitleLabel}
                    included={collectJobTitle}
                    onIncludedChange={setCollectJobTitle}
                    required={jobTitleRequired}
                    onRequiredChange={setJobTitleRequired}
                    onEnter={(e) => handleEnterKey(e, goNext)}
                  />
                  <RespondentFieldRow
                    label={companyLabel}
                    onLabelChange={setCompanyLabel}
                    included={collectCompany}
                    onIncludedChange={setCollectCompany}
                    required={companyRequired}
                    onRequiredChange={setCompanyRequired}
                    onEnter={(e) => handleEnterKey(e, goNext)}
                  />
                </div>

                {/* Custom fields are always collected once added — there is
                    no include/exclude for them, since removing one is the
                    same action. So the row carries the same Optional /
                    Required control as the built-ins, plus Remove. */}
                {customFields.length > 0 && (
                  <div className="flex flex-col gap-1 border-t border-border pt-2">
                    {customFields.map((field) => (
                      <div
                        key={field.key}
                        className="group flex items-center gap-2.5 rounded-control border border-border bg-secondary/40 px-3 py-2"
                      >
                        <span className="flex-1 truncate text-sm text-card-foreground">{field.label}</span>
                        <RequiredToggle
                          required={field.required === true}
                          onChange={() => toggleCustomFieldRequired(field.key)}
                          fieldLabel={field.label}
                        />
                        <button
                          type="button"
                          onClick={() => removeCustomField(field.key)}
                          className="shrink-0 rounded-control px-1 text-xs text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`Remove ${field.label}`}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* New fields land as Optional; the row's own control changes
                    that afterwards, which is one less decision at the moment
                    of typing a name. */}
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
              hint="Shown to respondents on the landing page. Keep it neutral and research-framed. Never mention selling, pain points, or the sponsor's sales goals."
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
                  <span className="text-right text-card-foreground">
                    {guide?.recommended_topic || brief?.publicTopic || "—"}
                  </span>
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
                onClick={() => brief && guide && createSurvey(brief, guide)}
                disabled={creating || !brief || !guide}
              >
                {creating && showCreateLoader && <BirdLoader size={18} label={false} />}
                {creating ? "Creating..." : "Create study"}
              </Button>
            </div>
          )}
        </div>
        {showPreview && <SurveyPreviewPanel
            externalTitle={externalTitle}
            slug={slug}
            publicDescription={publicDescription}
            enabledFields={previewEnabledFields}
            customFields={customFields}
          />}
      </div>
      </div>
    </div>
  );
}
