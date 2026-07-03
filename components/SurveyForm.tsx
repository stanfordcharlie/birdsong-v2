"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";
import type { OptionalRespondentField } from "@/lib/surveys/respondent-fields";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const MAX_SLUG_LENGTH = 60;

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (base.length <= MAX_SLUG_LENGTH) return base;

  const truncated = base.slice(0, MAX_SLUG_LENGTH);
  const lastHyphen = truncated.lastIndexOf("-");
  return (lastHyphen > 0 ? truncated.slice(0, lastHyphen) : truncated).replace(/-+$/, "");
}

export type SurveyFormValues = {
  title: string;
  slug: string;
  topic: string;
  questionGuide: string;
  tone: string;
  numQuestions: string;
  giftCardAmount: string;
  collectPhone: boolean;
  collectJobTitle: boolean;
  collectCompany: boolean;
};

const EMPTY_VALUES: SurveyFormValues = {
  title: "",
  slug: "",
  topic: "",
  questionGuide: "",
  tone: "",
  numQuestions: "",
  giftCardAmount: "",
  collectPhone: false,
  collectJobTitle: false,
  collectCompany: false,
};

type SurveyFormProps =
  | { mode: "create" }
  | { mode: "edit"; surveyId: string; initialValues: SurveyFormValues };

const invalidBorder = "border-destructive focus-visible:ring-destructive";

export function SurveyForm(props: SurveyFormProps) {
  const router = useRouter();
  const isEdit = props.mode === "edit";
  const initial = isEdit ? props.initialValues : EMPTY_VALUES;

  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  // An existing survey's slug is already published, so it must never
  // silently change just because the title changed; only a create-mode
  // slug auto-syncs with the title, and only until the user edits it.
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [topic, setTopic] = useState(initial.topic);
  const [questionGuide, setQuestionGuide] = useState(initial.questionGuide);
  const [tone, setTone] = useState(initial.tone);
  const [numQuestions, setNumQuestions] = useState(initial.numQuestions);
  const [giftCardAmount, setGiftCardAmount] = useState(initial.giftCardAmount);
  const [collectPhone, setCollectPhone] = useState(initial.collectPhone);
  const [collectJobTitle, setCollectJobTitle] = useState(initial.collectJobTitle);
  const [collectCompany, setCollectCompany] = useState(initial.collectCompany);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideError, setGuideError] = useState<string | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugify(title));
    }
  }, [title, slugTouched]);

  const titleInvalid = attemptedSubmit && !title.trim();
  const slugInvalid = attemptedSubmit && !slugify(slug);
  const guideInvalid = attemptedSubmit && !questionGuide.trim();
  const numQuestionsInvalid = attemptedSubmit && !numQuestions.trim();

  async function handleSpruceUp() {
    setGuideError(null);
    setGuideLoading(true);
    try {
      const res = await fetch("/api/surveys/question-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          topic,
          tone,
          existing_guide: questionGuide,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate a question guide");
      setQuestionGuide(data.question_guide);
    } catch (err) {
      setGuideError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGuideLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setAttemptedSubmit(true);

    const baseSlug = slugify(slug);
    if (!title.trim() || !baseSlug || !questionGuide.trim() || !numQuestions.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const enabledFields: OptionalRespondentField[] = [
        ...(collectPhone ? (["phone"] as const) : []),
        ...(collectJobTitle ? (["job_title"] as const) : []),
        ...(collectCompany ? (["company"] as const) : []),
      ];

      const payload = {
        title,
        topic: topic || null,
        question_guide: questionGuide || null,
        tone: tone || null,
        num_questions: numQuestions ? Number(numQuestions) : null,
        gift_card_amount: giftCardAmount ? Number(giftCardAmount) : null,
        custom_fields: enabledFields as Json,
      };

      let candidateSlug = baseSlug;
      let attempt = 1;
      let resultId: string | null = null;

      while (attempt <= 20) {
        const { data, error: dbError } = isEdit
          ? await supabase
              .from("surveys")
              .update({ ...payload, slug: candidateSlug })
              .eq("id", props.surveyId)
              .select("id")
              .single()
          : await supabase
              .from("surveys")
              .insert({ ...payload, slug: candidateSlug, user_id: user.id })
              .select("id")
              .single();

        if (!dbError) {
          resultId = data.id;
          break;
        }

        // 23505 = unique_violation. slug is the only unique column, so a
        // collision means another survey already has this slug; retry with
        // an incremented suffix instead of failing the save.
        if (dbError.code === "23505") {
          attempt += 1;
          candidateSlug = `${baseSlug}-${attempt}`;
          continue;
        }

        throw dbError;
      }

      if (!resultId) {
        throw new Error("Couldn't find an available slug, try editing it manually.");
      }

      if (isEdit) {
        setSlug(candidateSlug);
        setSaved(true);
        router.refresh();
      } else {
        router.push(`/admin/surveys/${resultId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-card-foreground">
          Title <span className="text-destructive">*</span>
        </span>
        <Input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={titleInvalid ? invalidBorder : ""}
        />
        {titleInvalid && <span className="text-xs text-destructive">Required</span>}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-card-foreground">
          Slug <span className="text-destructive">*</span>
        </span>
        <Input
          type="text"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          className={`font-mono text-sm ${slugInvalid ? invalidBorder : ""}`}
        />
        <span className="text-xs text-muted-foreground">{`/survey/${slug || "..."}`}</span>
        {slugInvalid && <span className="text-xs text-destructive">Required</span>}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-card-foreground">Topic</span>
        <Textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={2} />
      </label>

      <label className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-card-foreground">
            Question guide <span className="text-destructive">*</span>
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSpruceUp}
            disabled={guideLoading}
          >
            {guideLoading ? "Sprucing up..." : "Spruce up with AI"}
          </Button>
        </div>
        <Textarea
          value={questionGuide}
          onChange={(e) => setQuestionGuide(e.target.value)}
          rows={5}
          className={guideInvalid ? invalidBorder : ""}
        />
        {guideInvalid && <span className="text-xs text-destructive">Required</span>}
        {guideError && <span className="text-sm text-destructive">{guideError}</span>}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-card-foreground">Tone</span>
        <Input
          type="text"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          placeholder="e.g. warm, curious, conversational"
        />
      </label>

      <div className="flex gap-4">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium text-card-foreground">
            Number of questions <span className="text-destructive">*</span>
          </span>
          <Input
            type="number"
            min="1"
            value={numQuestions}
            onChange={(e) => setNumQuestions(e.target.value)}
            className={numQuestionsInvalid ? invalidBorder : ""}
          />
          {numQuestionsInvalid && <span className="text-xs text-destructive">Required</span>}
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium text-card-foreground">Gift card amount ($)</span>
          <Input
            type="number"
            min="0"
            value={giftCardAmount}
            onChange={(e) => setGiftCardAmount(e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-col gap-2 rounded-control border border-border bg-secondary/40 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Respondent info
        </h3>
        <p className="text-xs text-muted-foreground">Name and email are always collected.</p>
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-sm text-card-foreground">
            <input
              type="checkbox"
              checked={collectPhone}
              onChange={(e) => setCollectPhone(e.target.checked)}
              className="accent-primary"
            />
            Phone number
          </label>
          <label className="flex items-center gap-2 text-sm text-card-foreground">
            <input
              type="checkbox"
              checked={collectJobTitle}
              onChange={(e) => setCollectJobTitle(e.target.checked)}
              className="accent-primary"
            />
            Job title
          </label>
          <label className="flex items-center gap-2 text-sm text-card-foreground">
            <input
              type="checkbox"
              checked={collectCompany}
              onChange={(e) => setCollectCompany(e.target.checked)}
              className="accent-primary"
            />
            Company name
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : isEdit ? "Save changes" : "Create survey"}
        </Button>
        {saved && <span className="text-sm text-muted-foreground">Saved.</span>}
      </div>
    </form>
  );
}
