"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BirdLoader } from "@/components/BirdLoader";
import { cn } from "@/lib/utils";
import type { ExtractedBrief } from "@/lib/brief/types";
import {
  SIGNAL_LABELS,
  type GuideTheme,
  type StructuredGuide,
} from "@/lib/surveys/guide";

/**
 * The review step. The generated guide, theme by theme, showing the
 * questions as the respondent will encounter them.
 *
 * research_intent and signal are internal and are shown deliberately: they
 * explain why each theme is there, which is what makes the guide read as
 * considered rather than arbitrary. Every question is editable in place,
 * every theme can be redrafted on its own, and the whole guide can be
 * redrafted. Nothing is created from this screen: continuing carries the
 * guide into the rest of the wizard, and the study is created by an
 * explicit action on its final step.
 */

function RegenerateIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      className={cn("shrink-0", spinning && "animate-spin")}
      aria-hidden
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

function FlagIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0" aria-hidden>
      <path
        d="M8 2v7M8 12.5v.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

/**
 * One question, plain text at rest and a textarea once clicked.
 *
 * Editing is the same click-the-thing-you-want-to-change move the wizard's
 * respondent field rows use, rather than rendering every question as a
 * permanent input, which made a guide of twenty questions read as a form to
 * fill in instead of a draft to react to.
 */
function EditableQuestion({
  value,
  onChange,
  label,
  emphasis,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  emphasis?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-[0.08em] text-faint">{label}</span>
      {editing ? (
        <Textarea
          autoFocus
          value={value}
          rows={2}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
            }
          }}
          className="resize-none text-sm"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Edit: ${value}`}
          className={cn(
            "rounded-control border border-transparent px-2 py-1.5 text-left leading-[1.5] transition-colors",
            "hover:border-border hover:bg-secondary/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            emphasis ? "text-[15px] text-card-foreground" : "text-sm text-muted-foreground"
          )}
        >
          {value || "Click to write this question"}
        </button>
      )}
    </div>
  );
}

function ThemeCard({
  theme,
  index,
  onChange,
  onRegenerate,
  regenerating,
}: {
  theme: GuideTheme;
  index: number;
  onChange: (theme: GuideTheme) => void;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  function setProbe(probeIndex: number, value: string) {
    onChange({
      ...theme,
      probes: theme.probes.map((p, i) => (i === probeIndex ? value : p)),
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium tabular-nums text-faint">{index + 1}</span>
            <h3 className="text-[15px] font-semibold text-card-foreground">{theme.theme}</h3>
            <span className="rounded-pill bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
              {SIGNAL_LABELS[theme.signal] ?? theme.signal}
            </span>
          </div>
          <p className="text-sm leading-[1.5] text-muted-foreground">{theme.research_intent}</p>
        </div>

        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerating}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-control px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <RegenerateIcon spinning={regenerating} />
          {regenerating ? "Redrafting" : "Redraft"}
        </button>
      </div>

      {theme.flags && theme.flags.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-control border border-destructive/30 bg-destructive/[0.05] px-3 py-2.5">
          <span className="text-xs font-semibold text-destructive">
            Review flagged this theme and one redraft did not clear it
          </span>
          <ul className="flex flex-col gap-1">
            {theme.flags.map((flag, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs leading-[1.5] text-destructive">
                <FlagIcon />
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2.5 border-t border-border pt-3">
        <EditableQuestion
          emphasis
          label="Opens with"
          value={theme.opening_question}
          onChange={(value) => onChange({ ...theme, opening_question: value })}
        />
        {theme.probes.map((probe, i) => (
          <EditableQuestion
            key={i}
            label={`Follow-up ${i + 1}`}
            value={probe}
            onChange={(value) => setProbe(i, value)}
          />
        ))}
        <EditableQuestion
          label="Number to get"
          value={theme.quantification_probe}
          onChange={(value) => onChange({ ...theme, quantification_probe: value })}
        />
      </div>
    </div>
  );
}

export function GuideReview({
  brief,
  guide,
  onChange,
  onRegenerateAll,
  regeneratingAll,
  onContinue,
  onBack,
}: {
  brief: ExtractedBrief;
  guide: StructuredGuide;
  onChange: (guide: StructuredGuide) => void;
  onRegenerateAll: () => void;
  regeneratingAll: boolean;
  onContinue: () => void;
  onBack: () => void;
}) {
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function regenerateOne(index: number) {
    setRegeneratingIndex(index);
    setError(null);
    try {
      const res = await fetch("/api/surveys/brief/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, guide, index }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't redraft that theme");
      onChange({
        ...guide,
        themes: guide.themes.map((t, i) => (i === index ? data.theme : t)),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't redraft that theme");
    } finally {
      setRegeneratingIndex(null);
    }
  }

  const flaggedCount = guide.themes.filter((t) => t.flags && t.flags.length > 0).length;

  if (regeneratingAll) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
        <BirdLoader size={26} label={false} />
        <p className="text-sm text-muted-foreground">
          Redrafting the guide and rechecking every question.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-xs font-medium text-muted-foreground hover:text-card-foreground"
      >
        ← Back
      </button>

      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-card-foreground">Recommended research guide</h2>
        <p className="text-sm leading-[1.5] text-muted-foreground">
          {guide.themes.length} themes drafted from your brief. The AI moderator opens each theme
          with the lead question and adapts the follow-ups to what it hears. Click any question to
          edit it.
        </p>
      </div>

      {flaggedCount > 0 && (
        <div className="rounded-control border border-destructive/30 bg-destructive/[0.05] px-3.5 py-3 text-sm leading-[1.5] text-destructive">
          {flaggedCount === 1 ? "One theme is" : `${flaggedCount} themes are`} flagged below. Review
          caught something in {flaggedCount === 1 ? "it" : "them"} that a redraft did not fix, so it
          is being shown to you instead of shipped quietly. Edit the question, redraft the theme
          again, or keep it as is.
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-control border border-border bg-secondary/40 p-4 text-sm">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-faint">
            Recommended title
          </span>
          <span className="leading-[1.5] text-card-foreground">
            {guide.recommended_title || "None suggested"}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-faint">
            Recommended topic
          </span>
          <span className="leading-[1.5] text-muted-foreground">
            {guide.recommended_topic || "None suggested"}
          </span>
        </div>
        {guide.recommended_custom_fields.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-faint">
              Worth collecting at intake
            </span>
            <span className="leading-[1.5] text-muted-foreground">
              {guide.recommended_custom_fields.map((f) => f.label).join(", ")}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {guide.themes.map((theme, i) => (
          <ThemeCard
            key={i}
            theme={theme}
            index={i}
            regenerating={regeneratingIndex === i}
            onRegenerate={() => regenerateOne(i)}
            onChange={(next) =>
              onChange({ ...guide, themes: guide.themes.map((t, j) => (j === i ? next : t)) })
            }
          />
        ))}
      </div>

      {error && <span className="text-sm text-destructive">{error}</span>}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button type="button" onClick={onContinue}>
          Use this guide
        </Button>
        <Button type="button" variant="secondary" onClick={onRegenerateAll}>
          Redraft the whole guide
        </Button>
      </div>
    </div>
  );
}
