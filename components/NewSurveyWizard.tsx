"use client";

import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
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
import { cn } from "@/lib/utils";

// Steps 0-5 are the Typeform-style metadata questions; step 6 hands off
// into the existing Survey details conversational panel unchanged.
// Metadata steps are 0..METADATA_STEP_COUNT-1 (internal name, external name,
// sponsor, slug, gift card, respondent info, then public description as the
// last metadata step); the final step at index METADATA_STEP_COUNT is the
// conversational interview setup. Public description is appended at the end
// so the earlier step indices (and the showPreview 1/3 checks) are unchanged.
const METADATA_STEP_COUNT = 7;
const TOTAL_STEPS = METADATA_STEP_COUNT + 1;

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

// Live mock of the respondent landing page (app/survey/[slug]/InterviewFlow.tsx's
// intro card), so the admin can see what an external name or slug change
// actually looks like before creating the survey. Placeholders keep it from
// ever looking broken while the real fields are still blank.
function SurveyPreviewPanel({ externalTitle, slug }: { externalTitle: string; slug: string }) {
  // "-xxxxxx" stands in for the random anti-enumeration suffix that gets
  // appended at creation (see createSurvey) — the real value doesn't exist
  // yet, and previewing without any tail would promise a URL that's never
  // what actually gets created.
  const previewSlug = `${slugify(slug) || "birdsong-research"}-xxxxxx`;
  const previewTitle = externalTitle.trim() || "Birdsong Research";

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</span>
      <div className="overflow-hidden rounded-card border border-border">
        <div className="flex flex-col gap-2 border-b border-border bg-secondary/50 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="truncate rounded-control bg-card px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
            birdsong.app/survey/<span className="text-card-foreground">{previewSlug}</span>
          </div>
        </div>
        {/* Mirrors the real respondent intro card (the "intro" stage in
            app/survey/[slug]/InterviewFlow.tsx): title, topic line, and the
            respondent-info fields, so this previews the actual first thing a
            respondent sees, not just the headline in isolation. */}
        <div className="bg-page p-6">
          <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-6">
            <h1 className="text-xl font-semibold text-card-foreground">{previewTitle}</h1>
            <p className="text-sm text-muted-foreground">
              A few quick questions about how your team handles this today.
            </p>
            <div className="flex flex-col gap-3">
              <Input type="text" placeholder="Your name" readOnly tabIndex={-1} className="pointer-events-none" />
              <Input type="email" placeholder="Your email" readOnly tabIndex={-1} className="pointer-events-none" />
              <Input type="tel" placeholder="Phone number" readOnly tabIndex={-1} className="pointer-events-none" />
              <Input type="text" placeholder="Job title" readOnly tabIndex={-1} className="pointer-events-none" />
              <Input type="text" placeholder="Company name" readOnly tabIndex={-1} className="pointer-events-none" />
              <Button type="button" tabIndex={-1} className="pointer-events-none">
                Start
              </Button>
            </div>
          </div>
        </div>
      </div>
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

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(externalTitle));
  }, [externalTitle, slugTouched]);

  const titleInvalid = titleError && !title.trim();
  const externalTitleInvalid = externalTitleError && !externalTitle.trim();
  const slugInvalid = slugError && !slugify(slug);

  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  function goNext() {
    setStep((s) => Math.min(METADATA_STEP_COUNT, s + 1));
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

  function handleDetailsGenerated(extracted: ExtractedSurveyDetails) {
    setExtractedDetails(extracted);
    createSurvey(extracted);
  }

  const isDetailsStep = step === METADATA_STEP_COUNT;
  const progressPercent = ((step + 1) / TOTAL_STEPS) * 100;
  const showPreview = step === 1 || step === 3;

  return (
    <div className={cn("flex w-full flex-col gap-6", showPreview ? "max-w-3xl" : "max-w-xl")}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className={showPreview ? "grid grid-cols-1 gap-8 md:grid-cols-2 md:items-start" : undefined}>
        <div className="rounded-card border border-border bg-card p-8">
          {step === 0 && (
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

          {step === 1 && (
            <StepShell
              label="External name"
              required
              helper="Shown to respondents on the interview page itself."
              error={externalTitleInvalid ? "Required" : null}
              onBack={goBack}
              footer={<StepFooter onNext={handleExternalTitleNext} />}
            >
              <Input
                autoFocus
                type="text"
                value={externalTitle}
                onChange={(e) => setExternalTitle(e.target.value)}
                onKeyDown={(e) => handleEnterKey(e, handleExternalTitleNext)}
                className={externalTitleInvalid ? invalidBorder : ""}
              />
            </StepShell>
          )}

          {step === 2 && (
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

          {step === 3 && (
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

          {step === 4 && (
            <StepShell
              label="Gift card amount ($)"
              optional
              onBack={goBack}
              footer={<StepFooter onNext={goNext} />}
            >
              <Input
                autoFocus
                type="number"
                min="0"
                value={giftCardAmount}
                onChange={(e) => setGiftCardAmount(e.target.value)}
                onKeyDown={(e) => handleEnterKey(e, goNext)}
              />
            </StepShell>
          )}

          {step === 5 && (
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

          {step === 6 && (
            <StepShell
              label="Public description"
              optional
              hint="Shown to respondents on the survey landing page. Keep it neutral and research-framed. Never mention selling, pain points, or the sponsor's sales goals."
              onBack={goBack}
              footer={<StepFooter onNext={goNext} />}
            >
              <Textarea
                autoFocus
                value={publicDescription}
                onChange={(e) => setPublicDescription(e.target.value)}
                rows={3}
                placeholder="A short, neutral summary of what this conversation is about."
              />
            </StepShell>
          )}

          {isDetailsStep && (
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
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">
                    {creating ? "Creating your survey..." : createError ? "Something went wrong." : "Done."}
                  </p>
                  {createError && (
                    <div className="flex flex-col gap-2">
                      <span className="text-sm text-destructive">{createError}</span>
                      <Button type="button" onClick={() => createSurvey(extractedDetails)}>
                        Retry
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <SurveyOnboardingChat onComplete={handleDetailsGenerated} />
              )}
            </div>
          )}
        </div>
        {showPreview && <SurveyPreviewPanel externalTitle={externalTitle} slug={slug} />}
      </div>
    </div>
  );
}
