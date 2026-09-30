"use client";

import { useEffect, useRef, useState } from "react";
import { FilterTabs } from "@/components/admin/ui";
import { bg, border, radius, text } from "@/components/admin/ui/tokens";
import {
  INTERVIEW_LENGTHS,
  INTERVIEW_LENGTH_PRESETS,
  interviewLengthSummary,
  type InterviewLength,
} from "@/lib/studies/interview-length";
import {
  GIFT_CARD_BRANDS,
  GIFT_CARD_BRAND_MAX_LENGTH,
  giftCardPhrase,
} from "@/lib/studies/incentive";
import {
  OPTIONAL_RESPONDENT_FIELDS,
  OPTIONAL_RESPONDENT_FIELD_LABELS,
  type CustomRespondentFieldDef,
} from "@/lib/studies/respondent-fields";
import { slugify } from "@/lib/studies/slugify";
import {
  GIFT_AMOUNT_MAX,
  REQUIRED_TO_CREATE,
  isFieldFilled,
  type BriefFieldKey,
  type StudyBrief,
} from "@/lib/study-brief/types";
import { cn } from "@/lib/utils";

const WAITING = "Waiting on your answer";

// The three optional respondent fields the wizard offers, in the order the
// intake form renders them, with the wizard's defaults: phone and job title
// on, company off (it is derived from the work email domain).
export const RESPONDENT_FIELD_KEYS = ["phone", "job_title", "company"] as const;
export type RespondentFieldKey = (typeof RESPONDENT_FIELD_KEYS)[number];
export type RespondentChoices = Record<RespondentFieldKey, { on: boolean; required: boolean }>;

export const DEFAULT_RESPONDENT_CHOICES: RespondentChoices = {
  phone: { on: true, required: false },
  job_title: { on: true, required: false },
  company: { on: false, required: false },
};

/** The choices as the {key, label, required} entries surveys.custom_fields holds. */
export function respondentFieldDefs(choices: RespondentChoices): CustomRespondentFieldDef[] {
  return RESPONDENT_FIELD_KEYS.filter((key) => choices[key].on).map((key) => ({
    key,
    label: OPTIONAL_RESPONDENT_FIELD_LABELS[key],
    required: choices[key].required,
  }));
}

const LABEL = cn("text-[12px] font-bold", text.muted2);
const HINT = cn("text-[12px]", text.muted2);

// The success tokens (app/globals.css, .admin-theme) as class names. Spelled
// here rather than in components/admin/ui/tokens.ts because this panel is
// their only reader so far; move them there when a second one appears.
const SUCCESS = {
  ground: "bg-[color:hsl(var(--ds-success-weak))]",
  border: "border-[color:hsl(var(--ds-success))]",
  ink: "text-[color:hsl(var(--ds-success))]",
  text: "text-[color:hsl(var(--ds-success-text))]",
} as const;

/** The short label each field is announced by: "Roles filled". */
export const BRIEF_FIELD_LABELS: Record<BriefFieldKey, string> = {
  internalName: "Internal name",
  externalTitle: "Title",
  sponsor: "Sponsor",
  audienceRoles: "Roles",
  audienceCompanies: "Companies",
  audienceIndustry: "Industry",
  researchQuestion: "Research question",
  topic: "Public topic",
  signals: "Signals",
  offLimits: "Off limits",
  publicDescription: "Public description",
  length: "Length",
  giftAmount: "Gift",
  giftBrand: "Gift brand",
  respondentFields: "What we collect",
};

/** When the AI last wrote each field, by the page's clock. Absent = never. */
export type AiWrites = Partial<Record<BriefFieldKey, number>>;

/** The latest AI write among a card's fields, or 0 when there is none. */
function latestWrite(writes: AiWrites, keys: readonly BriefFieldKey[]): number {
  return keys.reduce((latest, key) => Math.max(latest, writes[key] ?? 0), 0);
}

const FLASH_MS = 600;

const fieldClass = cn(
  "focus-ring w-full border px-[10px] py-[7px] text-[14px] leading-[1.5] placeholder:text-[color:hsl(var(--ds-muted-3))]",
  radius.chip,
  border.base,
  bg.base,
  text.ink
);

/**
 * One brief card. Dashed while it is still waiting on an answer; on the
 * success ground with a check once it has one. `filled` is always derived
 * from the value by the caller, never stored, so the two cannot disagree.
 *
 * `flashAt` is the clock reading of the last AI write to this card. When it
 * changes, the ground flashes from a stronger green down to the filled
 * style, so an admin reading the thread sees which box just moved. Manual
 * edits never set it. Under reduced motion the style changes in place.
 *
 * `neutral` is for a card that always has content (the respondent details
 * choices), which would otherwise be green forever and mean nothing.
 */
function BriefCard({
  label,
  filled,
  flashAt = 0,
  neutral = false,
  hint,
  children,
}: {
  label: string;
  filled: boolean;
  flashAt?: number;
  neutral?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const success = filled && !neutral;

  useEffect(() => {
    const el = ref.current;
    if (!flashAt || !el || !success) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const styles = getComputedStyle(el);
    const strong = styles.getPropertyValue("--ds-success").trim();
    const weak = styles.getPropertyValue("--ds-success-weak").trim();
    if (!strong || !weak) return;
    const animation = el.animate(
      [{ backgroundColor: `hsl(${strong} / 0.28)` }, { backgroundColor: `hsl(${weak})` }],
      { duration: FLASH_MS, easing: "ease-out" }
    );
    return () => animation.cancel();
  }, [flashAt, success]);

  return (
    <section
      ref={ref}
      data-filled={success ? "true" : undefined}
      className={cn(
        "flex flex-col gap-[6px] border px-[18px] py-4 transition-colors motion-reduce:transition-none",
        radius.card,
        success
          ? cn(SUCCESS.ground, SUCCESS.border)
          : cn(bg.base, filled ? border.base : cn("border-dashed", border.dashed))
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className={LABEL}>{label}</h3>
        {success && (
          <span className={cn("flex h-[16px] w-[16px] shrink-0 items-center justify-center", SUCCESS.ink)}>
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m5 12 5 5L20 7" />
            </svg>
            <span className="sr-only">Filled</span>
          </span>
        )}
      </div>
      {children}
      {hint && <p className={HINT}>{hint}</p>}
    </section>
  );
}

/**
 * Text that becomes its own field when clicked. Enter commits a single line,
 * Cmd or Ctrl with Enter commits several, leaving the field commits either,
 * and Escape puts back what was there.
 */
function Editable({
  value,
  label,
  multiline = false,
  mono = false,
  display,
  displayClassName,
  onCommit,
}: {
  value: string;
  /** Names the field for screen readers. */
  label: string;
  multiline?: boolean;
  mono?: boolean;
  /** What to show at rest in place of the plain value. */
  display?: React.ReactNode;
  displayClassName?: string;
  onCommit: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  // Escape unmounts the field, and a browser may blur it on the way out.
  const cancelled = useRef(false);

  function open() {
    cancelled.current = false;
    setDraft(value);
    setEditing(true);
  }

  function commit() {
    if (cancelled.current) return;
    setEditing(false);
    const next = draft.trim();
    if (next !== value.trim()) onCommit(next);
  }

  function cancel() {
    cancelled.current = true;
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={open}
        aria-label={`Edit ${label}`}
        className={cn(
          "focus-ring -mx-[6px] px-[6px] py-[2px] text-left hover:bg-[color:hsl(var(--ds-bg-sidebar))]",
          radius.chip
        )}
      >
        {value.trim() ? (
          (display ?? (
            <span
              className={cn(
                "block whitespace-pre-wrap break-words text-[14px] leading-[1.5]",
                mono && "font-mono text-[13px]",
                displayClassName
              )}
            >
              {value}
            </span>
          ))
        ) : (
          <span className={cn("block text-[14px] leading-[1.5]", text.muted3)}>{WAITING}</span>
        )}
      </button>
    );
  }

  const shared = {
    autoFocus: true,
    value: draft,
    "aria-label": label,
    onBlur: commit,
    className: cn(fieldClass, mono && "font-mono text-[13px]"),
  };

  return multiline ? (
    <textarea
      {...shared}
      rows={Math.min(8, Math.max(3, draft.split("\n").length + 1))}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Escape") cancel();
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
      }}
    />
  ) : (
    <input
      {...shared}
      type="text"
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Escape") cancel();
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      }}
    />
  );
}

function SignalList({ signals }: { signals: string[] }) {
  return (
    <ol className="flex flex-col gap-[10px] pt-1">
      {signals.map((signal, i) => (
        <li key={i} className="flex items-start gap-[10px] text-[14px] leading-[1.5]">
          <span
            aria-hidden
            className={cn(
              "flex h-[22px] w-[22px] shrink-0 items-center justify-center font-mono text-[11px]",
              radius.chip,
              bg.accentWeak,
              text.accent
            )}
          >
            {i + 1}
          </span>
          <span className="min-w-0 break-words">{signal}</span>
        </li>
      ))}
    </ol>
  );
}

function ChoiceChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "focus-ring flex h-[28px] items-center px-[10px] text-[12px] font-bold transition-colors",
        radius.chip,
        selected ? cn(bg.ink, text.onInk) : cn(bg.track, text.muted, "hover:text-[color:hsl(var(--ds-ink))]")
      )}
    >
      {children}
    </button>
  );
}

function GiftControls({
  amount,
  brand,
  onEdit,
}: {
  amount: number | null;
  brand: string | null;
  onEdit: (key: BriefFieldKey, value: unknown) => void;
}) {
  const listed = brand !== null && (GIFT_CARD_BRANDS as readonly string[]).includes(brand);
  const [otherOpen, setOtherOpen] = useState(brand !== null && !listed);
  // What is being typed, as typed. The brief holds the trimmed value, and
  // showing that back would swallow the space between two words.
  const [otherText, setOtherText] = useState(listed ? "" : (brand ?? ""));
  const hasGift = amount !== null && amount > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <label className={cn("flex h-[38px] w-[120px] items-center gap-1 border px-[10px]", radius.control, border.base, bg.base)}>
          <span className={cn("text-[14px]", text.muted2)}>$</span>
          <input
            type="number"
            min={0}
            max={GIFT_AMOUNT_MAX}
            inputMode="numeric"
            aria-label="Gift card amount in dollars"
            value={amount === null ? "" : amount}
            onChange={(e) => {
              const raw = e.target.value;
              onEdit("giftAmount", raw === "" ? null : Number(raw));
            }}
            className={cn("min-w-0 flex-1 border-0 bg-transparent font-mono text-[14px] outline-none", text.ink)}
          />
        </label>
        <ChoiceChip selected={amount === 0} onClick={() => onEdit("giftAmount", 0)}>
          No gift
        </ChoiceChip>
      </div>

      {hasGift && (
        <>
          <div className="flex flex-wrap gap-[6px]" role="group" aria-label="Gift card brand">
            {GIFT_CARD_BRANDS.map((option) => (
              <ChoiceChip
                key={option}
                selected={!otherOpen && brand === option}
                onClick={() => {
                  setOtherOpen(false);
                  onEdit("giftBrand", brand === option ? null : option);
                }}
              >
                {option}
              </ChoiceChip>
            ))}
            <ChoiceChip
              selected={otherOpen}
              onClick={() => {
                setOtherOpen((open) => !open);
                setOtherText("");
                onEdit("giftBrand", null);
              }}
            >
              Other
            </ChoiceChip>
          </div>
          {otherOpen && (
            <input
              type="text"
              maxLength={GIFT_CARD_BRAND_MAX_LENGTH}
              placeholder="Brand name"
              aria-label="Other gift card brand"
              value={otherText}
              onChange={(e) => {
                setOtherText(e.target.value);
                onEdit("giftBrand", e.target.value);
              }}
              className={fieldClass}
            />
          )}
          <p className={HINT}>Respondents will see {giftCardPhrase(amount, brand)}.</p>
        </>
      )}
      {amount === null && <p className={cn("text-[14px]", text.muted3)}>{WAITING}</p>}
    </div>
  );
}

export function BriefPanel({
  brief,
  slug,
  respondent,
  notice,
  aiWrites,
  onEdit,
  onSlugChange,
  onRespondentChange,
}: {
  brief: StudyBrief;
  /** When the AI last wrote each field. Drives the flash, never the state. */
  aiWrites: AiWrites;
  /** The link as typed, or null while it follows the title. */
  slug: string | null;
  respondent: RespondentChoices;
  /** What Create study is doing, or why it could not. */
  notice: { kind: "error" | "progress"; message: string } | null;
  /** A manual edit. The page marks the field as the admin's from then on. */
  onEdit: (key: BriefFieldKey, value: unknown) => void;
  onSlugChange: (slug: string) => void;
  onRespondentChange: (choices: RespondentChoices) => void;
}) {
  const link = slugify(slug ?? brief.externalTitle);
  const filled = (key: BriefFieldKey) => isFieldFilled(brief, key);
  const audienceKeys = ["audienceRoles", "audienceCompanies", "audienceIndustry"] as const;
  const audienceFilled = audienceKeys.some(filled);
  const wroteAt = (...keys: BriefFieldKey[]) => latestWrite(aiWrites, keys);

  // The required fields, which is what Create study waits on. The optional
  // ones (off limits, length, gift, description) have defaults and are not
  // counted, so the number reads as distance from Create.
  const requiredTotal = REQUIRED_TO_CREATE.length;
  const requiredFilled = REQUIRED_TO_CREATE.filter(filled).length;
  const allFilled = requiredFilled === requiredTotal;

  return (
    <aside
      aria-label="Study brief"
      className={cn(
        "flex w-[440px] shrink-0 flex-col gap-4 overflow-y-auto p-7 max-xl:w-[360px]",
        bg.sidebar
      )}
    >
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-[10px]">
          <h2 className={cn("text-[12px] font-bold uppercase tracking-[0.04em]", text.muted2)}>Study brief</h2>
          {/* Not a live region: the AI fill announcement already says what
              changed, and a second announcement of the count would double it. */}
          <span className={cn("text-[12px]", allFilled ? cn("font-bold", SUCCESS.text) : text.muted2)}>
            <span className="font-mono">{requiredFilled}</span> of{" "}
            <span className="font-mono">{requiredTotal}</span> filled
          </span>
        </div>
        <span className={HINT}>Editable anytime</span>
      </div>

      {notice && (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={cn(
            "border px-[14px] py-[10px] text-[13px] leading-[1.45]",
            radius.control,
            notice.kind === "error"
              ? "border-[color:hsl(var(--ds-warn-border))] bg-[color:hsl(var(--ds-warn-bg))] text-[color:hsl(var(--ds-warn-text))]"
              : cn(border.base, bg.base, text.ink3)
          )}
        >
          {notice.message}
        </p>
      )}

      <BriefCard
        label="Internal name"
        filled={filled("internalName")}
        flashAt={wroteAt("internalName")}
        hint="Respondents never see this."
      >
        <Editable
          label="internal name"
          value={brief.internalName}
          displayClassName="text-[17px] font-extrabold leading-[1.25] tracking-[-0.02em]"
          onCommit={(v) => onEdit("internalName", v)}
        />
      </BriefCard>

      <BriefCard
        label="Respondent-facing title"
        filled={filled("externalTitle")}
        flashAt={wroteAt("externalTitle")}
      >
        <Editable
          label="respondent-facing title"
          value={brief.externalTitle}
          displayClassName="text-[15px] font-bold"
          onCommit={(v) => onEdit("externalTitle", v)}
        />
      </BriefCard>

      <BriefCard label="Sponsor" filled={filled("sponsor")} flashAt={wroteAt("sponsor")}>
        <Editable label="sponsor" value={brief.sponsor} onCommit={(v) => onEdit("sponsor", v)} />
      </BriefCard>

      <BriefCard
        label="What we want to learn"
        filled={filled("researchQuestion")}
        flashAt={wroteAt("researchQuestion")}
      >
        <Editable
          multiline
          label="what we want to learn"
          value={brief.researchQuestion}
          onCommit={(v) => onEdit("researchQuestion", v)}
        />
      </BriefCard>

      <BriefCard
        label="Public topic"
        filled={filled("topic")}
        flashAt={wroteAt("topic")}
        hint="What respondents are told the study is about."
      >
        <Editable multiline label="public topic" value={brief.topic} onCommit={(v) => onEdit("topic", v)} />
      </BriefCard>

      <BriefCard
        label="Who we want to hear from"
        filled={audienceFilled}
        flashAt={wroteAt(...audienceKeys)}
      >
        <div className="flex flex-col gap-[6px]">
          {(
            [
              ["audienceRoles", "Roles"],
              ["audienceCompanies", "Companies"],
              ["audienceIndustry", "Industry"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="grid grid-cols-[84px_minmax(0,1fr)] items-start gap-2">
              <span className={cn("pt-[4px] text-[12px]", text.muted2)}>{label}</span>
              <Editable multiline label={label.toLowerCase()} value={brief[key]} onCommit={(v) => onEdit(key, v)} />
            </div>
          ))}
        </div>
      </BriefCard>

      <BriefCard
        label="What makes someone worth a call"
        filled={filled("signals")}
        flashAt={wroteAt("signals")}
      >
        <Editable
          multiline
          label="what makes someone worth a call, one per line"
          value={brief.signals.join("\n")}
          display={<SignalList signals={brief.signals} />}
          onCommit={(v) => onEdit("signals", v.split("\n"))}
        />
      </BriefCard>

      <BriefCard label="Off limits" filled={filled("offLimits")} flashAt={wroteAt("offLimits")}>
        <Editable multiline label="off limits" value={brief.offLimits} onCommit={(v) => onEdit("offLimits", v)} />
      </BriefCard>

      {/* Name and work email are not offered: every study collects them, so
          they are stated rather than chosen. The four that follow are the
          study's own, and an empty set is a real answer, which is why this
          card reads "Name and email only" rather than sitting empty. */}
      <BriefCard
        label="What we collect"
        filled={filled("respondentFields")}
        flashAt={wroteAt("respondentFields")}
        hint="Asked before the interview starts. Name and work email always."
      >
        <div className="flex flex-wrap gap-1.5">
          {OPTIONAL_RESPONDENT_FIELDS.map((field) => {
            const chosen = brief.respondentFields?.includes(field) ?? false;
            return (
              <button
                key={field}
                type="button"
                aria-pressed={chosen}
                onClick={() => {
                  const current = brief.respondentFields ?? [];
                  const next = chosen
                    ? current.filter((value) => value !== field)
                    : OPTIONAL_RESPONDENT_FIELDS.filter(
                        (value) => value === field || current.includes(value)
                      );
                  onEdit("respondentFields", next);
                }}
                className={cn(
                  "focus-ring border px-[10px] py-[5px] text-[13px] font-semibold transition-colors",
                  radius.pill,
                  chosen
                    ? cn(border.accent, "bg-[color:hsl(var(--ds-accent-weak))]", text.accent)
                    : cn(border.base, text.muted2, "hover:text-[color:hsl(var(--ds-ink))]")
                )}
              >
                {OPTIONAL_RESPONDENT_FIELD_LABELS[field]}
              </button>
            );
          })}
        </div>
        <p className={brief.respondentFields !== null ? HINT : cn("text-[14px]", text.muted3)}>
          {brief.respondentFields === null
            ? WAITING
            : brief.respondentFields.length === 0
              ? "Name and email only."
              : `Name, email and ${brief.respondentFields.length} more.`}
        </p>
      </BriefCard>

      <BriefCard label="Length" filled={filled("length")} flashAt={wroteAt("length")}>
        <FilterTabs<InterviewLength | "">
          label="Interview length"
          className="self-start"
          value={brief.length ?? ""}
          onChange={(value) => onEdit("length", value)}
          tabs={INTERVIEW_LENGTHS.map((value) => ({
            value,
            label: `${INTERVIEW_LENGTH_PRESETS[value].minutes} min`,
          }))}
        />
        <p className={brief.length ? HINT : cn("text-[14px]", text.muted3)}>
          {brief.length ? interviewLengthSummary(INTERVIEW_LENGTH_PRESETS[brief.length]) : WAITING}
        </p>
      </BriefCard>

      <BriefCard
        label="Thank you gift"
        filled={filled("giftAmount")}
        flashAt={wroteAt("giftAmount", "giftBrand")}
      >
        <GiftControls amount={brief.giftAmount} brand={brief.giftBrand} onEdit={onEdit} />
      </BriefCard>

      <BriefCard
        label="Public description"
        filled={filled("publicDescription")}
        flashAt={wroteAt("publicDescription")}
        hint="Optional. Shown on the landing page."
      >
        <Editable
          multiline
          label="public description"
          value={brief.publicDescription}
          onCommit={(v) => onEdit("publicDescription", v)}
        />
      </BriefCard>

      <BriefCard label="Link" filled={Boolean(link)} hint="The ending is added when the study is created.">
        <Editable
          mono
          label="link"
          value={link ? `/study/${link}-xxxxxx` : ""}
          onCommit={(v) => onSlugChange(v.replace(/^\/?study\//, "").replace(/-x{6}$/, ""))}
        />
      </BriefCard>

      <BriefCard label="Respondent details" filled neutral hint="Name and email are always collected.">
        <div className="flex flex-col gap-2 pt-1">
          {RESPONDENT_FIELD_KEYS.map((key) => {
            const choice = respondent[key];
            const label = OPTIONAL_RESPONDENT_FIELD_LABELS[key];
            return (
              <div key={key} className="flex items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-[14px]">
                  <input
                    type="checkbox"
                    checked={choice.on}
                    onChange={(e) =>
                      onRespondentChange({ ...respondent, [key]: { ...choice, on: e.target.checked } })
                    }
                    className="focus-ring h-4 w-4 accent-[color:hsl(var(--ds-accent))]"
                  />
                  {label}
                </label>
                {choice.on && (
                  <label className={cn("flex cursor-pointer items-center gap-[6px] text-[12px]", text.muted2)}>
                    <input
                      type="checkbox"
                      checked={choice.required}
                      aria-label={`${label} is required`}
                      onChange={(e) =>
                        onRespondentChange({ ...respondent, [key]: { ...choice, required: e.target.checked } })
                      }
                      className="focus-ring h-[14px] w-[14px] accent-[color:hsl(var(--ds-accent))]"
                    />
                    Required
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </BriefCard>
    </aside>
  );
}
