"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
  sponsor: string;
  questionGuide: string;
  tone: string;
  numQuestions: string;
  giftCardAmount: string;
};

const EMPTY_VALUES: SurveyFormValues = {
  title: "",
  slug: "",
  topic: "",
  sponsor: "",
  questionGuide: "",
  tone: "",
  numQuestions: "",
  giftCardAmount: "",
};

type SurveyFormProps =
  | { mode: "create" }
  | { mode: "edit"; surveyId: string; initialValues: SurveyFormValues };

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
  const [sponsor, setSponsor] = useState(initial.sponsor);
  const [sponsorContext, setSponsorContext] = useState("");
  const [questionGuide, setQuestionGuide] = useState(initial.questionGuide);
  const [tone, setTone] = useState(initial.tone);
  const [numQuestions, setNumQuestions] = useState(initial.numQuestions);
  const [giftCardAmount, setGiftCardAmount] = useState(initial.giftCardAmount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideError, setGuideError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugify(title));
    }
  }, [title, slugTouched]);

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
          sponsor,
          sponsor_context: sponsorContext,
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

    const baseSlug = slugify(slug);
    if (!baseSlug) {
      setError("Slug can't be empty.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const payload = {
        title,
        topic: topic || null,
        sponsor: sponsor || null,
        question_guide: questionGuide || null,
        tone: tone || null,
        num_questions: numQuestions ? Number(numQuestions) : null,
        gift_card_amount: giftCardAmount ? Number(giftCardAmount) : null,
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
        <span className="text-sm font-medium">Title</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="rounded border bg-white px-3 py-2 text-neutral-900"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Slug</span>
        <input
          type="text"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          required
          className="rounded border bg-white px-3 py-2 font-mono text-sm text-neutral-900"
        />
        <span className="text-xs text-neutral-500">{`/survey/${slug || "..."}`}</span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Topic</span>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={2}
          className="rounded border bg-white px-3 py-2 text-neutral-900"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Sponsor</span>
        <input
          type="text"
          value={sponsor}
          onChange={(e) => setSponsor(e.target.value)}
          className="rounded border bg-white px-3 py-2 text-neutral-900"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">What does the sponsor do?</span>
        <textarea
          value={sponsorContext}
          onChange={(e) => setSponsorContext(e.target.value)}
          rows={2}
          placeholder="Optional — helps AI tailor the question guide toward relevant problems"
          className="rounded border bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400"
        />
      </label>

      <label className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Question guide</span>
          <button
            type="button"
            onClick={handleSpruceUp}
            disabled={guideLoading}
            className="rounded border px-2 py-1 text-xs text-neutral-900 disabled:opacity-50"
          >
            {guideLoading ? "Sprucing up..." : "Spruce up with AI"}
          </button>
        </div>
        <textarea
          value={questionGuide}
          onChange={(e) => setQuestionGuide(e.target.value)}
          rows={5}
          className="rounded border bg-white px-3 py-2 text-neutral-900"
        />
        {guideError && <span className="text-sm text-red-600">{guideError}</span>}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Tone</span>
        <input
          type="text"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          placeholder="e.g. warm, curious, conversational"
          className="rounded border bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400"
        />
      </label>

      <div className="flex gap-4">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium">Number of questions</span>
          <input
            type="number"
            min="1"
            value={numQuestions}
            onChange={(e) => setNumQuestions(e.target.value)}
            className="rounded border bg-white px-3 py-2 text-neutral-900"
          />
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium">Gift card amount ($)</span>
          <input
            type="number"
            min="0"
            value={giftCardAmount}
            onChange={(e) => setGiftCardAmount(e.target.value)}
            className="rounded border bg-white px-3 py-2 text-neutral-900"
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Saving..." : isEdit ? "Save changes" : "Create survey"}
        </button>
        {saved && <span className="text-sm text-neutral-500">Saved.</span>}
      </div>
    </form>
  );
}
