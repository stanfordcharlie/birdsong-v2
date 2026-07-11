"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";
import {
  slugifyCustomFieldKey,
  type CustomRespondentFieldDef,
  type OptionalRespondentField,
} from "@/lib/surveys/respondent-fields";
import { SurveyOnboardingChat } from "@/components/SurveyOnboardingChat";
import { SURVEY_TONE_OPTIONS, type ExtractedSurveyDetails } from "@/lib/survey-onboarding/types";
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
  externalTitle: string;
  slug: string;
  sponsor: string;
  topic: string;
  targetIndustry: string;
  targetJobTitle: string;
  targetCompanySize: string;
  questionGuide: string;
  tone: string;
  numQuestions: string;
  giftCardAmount: string;
  collectPhone: boolean;
  collectJobTitle: boolean;
  collectCompany: boolean;
  collectLinkedin: boolean;
  customFields: CustomRespondentFieldDef[];
};

const EMPTY_VALUES: SurveyFormValues = {
  title: "",
  externalTitle: "",
  slug: "",
  sponsor: "",
  topic: "",
  targetIndustry: "",
  targetJobTitle: "",
  targetCompanySize: "",
  questionGuide: "",
  tone: "",
  numQuestions: "",
  giftCardAmount: "",
  collectPhone: false,
  collectJobTitle: false,
  collectCompany: false,
  collectLinkedin: false,
  customFields: [],
};

type SurveyFormProps =
  | { mode: "create" }
  | { mode: "edit"; surveyId: string; initialValues: SurveyFormValues };

const invalidBorder = "border-destructive focus-visible:ring-destructive";
const selectClasses =
  "flex h-9 w-full rounded-control border border-input bg-card px-3 py-2 text-sm text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function SurveyForm(props: SurveyFormProps) {
  const router = useRouter();
  const isEdit = props.mode === "edit";
  const initial = isEdit ? props.initialValues : EMPTY_VALUES;

  const [title, setTitle] = useState(initial.title);
  const [externalTitle, setExternalTitle] = useState(initial.externalTitle);
  const [slug, setSlug] = useState(initial.slug);
  // An existing survey's slug is already published, so it must never
  // silently change just because the external name changed; only a
  // create-mode slug auto-syncs, and only until the user edits it. Synced
  // from the external name (not the internal one) since the slug is part
  // of the public URL respondents see.
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [sponsor, setSponsor] = useState(initial.sponsor);
  const [topic, setTopic] = useState(initial.topic);
  const [targetIndustry, setTargetIndustry] = useState(initial.targetIndustry);
  const [targetJobTitle, setTargetJobTitle] = useState(initial.targetJobTitle);
  const [targetCompanySize, setTargetCompanySize] = useState(initial.targetCompanySize);
  const [questionGuide, setQuestionGuide] = useState(initial.questionGuide);
  const [tone, setTone] = useState(initial.tone);
  const [numQuestions, setNumQuestions] = useState(initial.numQuestions);
  const [giftCardAmount, setGiftCardAmount] = useState(initial.giftCardAmount);
  const [collectPhone, setCollectPhone] = useState(initial.collectPhone);
  const [collectJobTitle, setCollectJobTitle] = useState(initial.collectJobTitle);
  const [collectCompany, setCollectCompany] = useState(initial.collectCompany);
  const [collectLinkedin, setCollectLinkedin] = useState(initial.collectLinkedin);
  const [customFields, setCustomFields] = useState<CustomRespondentFieldDef[]>(
    initial.customFields
  );
  const [newCustomFieldLabel, setNewCustomFieldLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideError, setGuideError] = useState<string | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  // Editing an existing survey always shows the plain fields directly (same
  // as every other field on this form); only a brand-new survey starts with
  // the conversational setup in place of them.
  const [showDetailsChat, setShowDetailsChat] = useState(!isEdit);

  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugify(externalTitle));
    }
  }, [externalTitle, slugTouched]);

  const titleInvalid = attemptedSubmit && !title.trim();
  const externalTitleInvalid = attemptedSubmit && !externalTitle.trim();
  const slugInvalid = attemptedSubmit && !slugify(slug);
  const guideInvalid = attemptedSubmit && !questionGuide.trim();
  const numQuestionsInvalid = attemptedSubmit && !numQuestions.trim();

  function handleDetailsGenerated(extracted: ExtractedSurveyDetails) {
    setTopic(extracted.topic);
    setTargetIndustry(extracted.targetIndustry);
    setTargetJobTitle(extracted.targetJobTitle);
    setTargetCompanySize(extracted.targetCompanySize);
    setTone(extracted.tone);
    setNumQuestions(String(extracted.numQuestions));
    setQuestionGuide(extracted.questionGuide);
    setShowDetailsChat(false);
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

    setCustomFields((prev) => [...prev, { key, label }]);
    setNewCustomFieldLabel("");
  }

  function removeCustomField(key: string) {
    setCustomFields((prev) => prev.filter((field) => field.key !== key));
  }

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
    if (
      !title.trim() ||
      !externalTitle.trim() ||
      !baseSlug ||
      !questionGuide.trim() ||
      !numQuestions.trim()
    ) {
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
        ...(collectLinkedin ? (["linkedin"] as const) : []),
      ];

      const payload = {
        title,
        external_title: externalTitle,
        sponsor: sponsor || null,
        topic: topic || null,
        target_industry: targetIndustry || null,
        target_job_title: targetJobTitle || null,
        target_company_size: targetCompanySize || null,
        question_guide: questionGuide || null,
        tone: tone || null,
        num_questions: numQuestions ? Number(numQuestions) : null,
        gift_card_amount: giftCardAmount ? Number(giftCardAmount) : null,
        // Presets stay bare strings; admin-defined fields are {key, label}
        // objects in the same array — see lib/surveys/respondent-fields.ts.
        custom_fields: [...enabledFields, ...customFields] as Json,
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
    <form onSubmit={handleSubmit} className="flex w-full max-w-5xl flex-col gap-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
        {/* Left column: clerical fields, no AI involved. */}
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-card-foreground">
              Internal name <span className="text-destructive">*</span>
            </span>
            <span className="text-xs text-muted-foreground">
              For your own reference in the admin dashboard. Respondents never see this.
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
              External name <span className="text-destructive">*</span>
            </span>
            <span className="text-xs text-muted-foreground">
              Shown to respondents on the interview page itself.
            </span>
            <Input
              type="text"
              value={externalTitle}
              onChange={(e) => setExternalTitle(e.target.value)}
              className={externalTitleInvalid ? invalidBorder : ""}
            />
            {externalTitleInvalid && <span className="text-xs text-destructive">Required</span>}
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
              <label className="flex items-center gap-2 text-sm text-card-foreground">
                <input
                  type="checkbox"
                  checked={collectLinkedin}
                  onChange={(e) => setCollectLinkedin(e.target.checked)}
                  className="accent-primary"
                />
                LinkedIn URL
              </label>
            </div>

            {customFields.length > 0 && (
              <div className="flex flex-col gap-1.5 border-t border-border pt-2">
                {customFields.map((field) => (
                  <div
                    key={field.key}
                    className="flex items-center justify-between gap-2 text-sm text-card-foreground"
                  >
                    <span>{field.label}</span>
                    <button
                      type="button"
                      onClick={() => removeCustomField(field.key)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${field.label}`}
                    >
                      Remove
                    </button>
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

          <div className="flex gap-4">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-card-foreground">
                Gift card amount ($)
              </span>
              <Input
                type="number"
                min="0"
                value={giftCardAmount}
                onChange={(e) => setGiftCardAmount(e.target.value)}
              />
            </label>

            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-card-foreground">
                Sponsor / company name
              </span>
              <Input
                type="text"
                value={sponsor}
                onChange={(e) => setSponsor(e.target.value)}
                placeholder="Who this research is conducted on behalf of"
              />
            </label>
          </div>
        </div>

        {/* Right column: conversational setup, or the fields it generates. */}
        <div className="flex flex-col gap-3 rounded-control border border-border p-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-card-foreground">Survey details</h3>
            <p className="text-xs text-muted-foreground">
              Research theme, target audience, tone, question count, and the question guide.
            </p>
          </div>

          {showDetailsChat ? (
            <SurveyOnboardingChat onComplete={handleDetailsGenerated} />
          ) : (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-card-foreground">Topic</span>
                <Textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={2} />
              </label>

              <div className="flex flex-col gap-2 rounded-control border border-border bg-secondary/40 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Target audience
                </h4>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <label className="flex flex-1 flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Industry</span>
                    <Textarea
                      value={targetIndustry}
                      onChange={(e) => setTargetIndustry(e.target.value)}
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </label>
                  <label className="flex flex-1 flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Job title</span>
                    <Textarea
                      value={targetJobTitle}
                      onChange={(e) => setTargetJobTitle(e.target.value)}
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </label>
                  <label className="flex flex-1 flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Company size</span>
                    <Textarea
                      value={targetCompanySize}
                      onChange={(e) => setTargetCompanySize(e.target.value)}
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-sm font-medium text-card-foreground">Tone</span>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className={selectClasses}
                  >
                    <option value="" disabled>
                      Select a tone
                    </option>
                    {SURVEY_TONE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                    {tone && !(SURVEY_TONE_OPTIONS as readonly string[]).includes(tone) && (
                      <option value={tone}>{tone}</option>
                    )}
                  </select>
                </label>

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
                  {numQuestionsInvalid && (
                    <span className="text-xs text-destructive">Required</span>
                  )}
                </label>
              </div>

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
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading || showDetailsChat}>
          {loading ? "Saving..." : isEdit ? "Save changes" : "Create survey"}
        </Button>
        {saved && <span className="text-sm text-muted-foreground">Saved.</span>}
      </div>
    </form>
  );
}
