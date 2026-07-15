"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { ResearchResult } from "@/lib/profile-onboarding/types";
import type { ProfileFormValues } from "./ProfileForm";

const TOTAL_STEPS = 4;

function StepShell({
  label,
  helper,
  onBack,
  footer,
  children,
}: {
  label: string;
  helper: string;
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
        <h2 className="text-lg font-semibold text-card-foreground">{label}</h2>
        <p className="text-sm text-muted-foreground">{helper}</p>
      </div>
      {children}
      {footer}
    </div>
  );
}

// Typeform-style first-time setup, shown only when no company profile data
// exists yet (see ProfileGate). Once onComplete fires, ProfileGate's own
// save logic takes over exactly as it already does for the chat-based
// onboarding this replaces, so this component owns nothing beyond
// collecting the four fields.
export function CompanyProfileWizard({
  onComplete,
}: {
  onComplete: (values: ProfileFormValues, research: ResearchResult | null) => void;
}) {
  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [whatWeSell, setWhatWeSell] = useState("");
  const [targetIcp, setTargetIcp] = useState("");
  const [valueProp, setValueProp] = useState("");

  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  function goNext() {
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  }

  function finish() {
    onComplete({ companyName, whatWeSell, targetIcp, valueProp }, null);
  }

  function handleTextInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      goNext();
    }
  }

  // Plain Enter must stay a normal newline in a textarea; only Cmd/Ctrl+Enter
  // advances, same shortcut convention as the rest of the app's chat inputs
  // use for a deliberate "submit" action.
  function handleTextareaKeyDown(e: KeyboardEvent<HTMLTextAreaElement>, onAdvance: () => void) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onAdvance();
    }
  }

  const progressPercent = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="rounded-card border border-border bg-card p-8 shadow-sm">
        {step === 0 && (
          <StepShell
            label="Company name"
            helper="Shown internally and used in generated copy."
            footer={
              <div className="flex items-center gap-3">
                <Button type="button" onClick={goNext}>
                  OK
                </Button>
                <span className="text-xs text-muted-foreground">press Enter ↵</span>
              </div>
            }
          >
            <Input
              autoFocus
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onKeyDown={handleTextInputKeyDown}
            />
          </StepShell>
        )}

        {step === 1 && (
          <StepShell
            label="What do you sell"
            helper="A couple sentences on the product itself."
            onBack={goBack}
            footer={
              <div className="flex items-center gap-3">
                <Button type="button" onClick={goNext}>
                  Continue
                </Button>
                <span className="text-xs text-muted-foreground">⌘/Ctrl + Enter</span>
              </div>
            }
          >
            <Textarea
              autoFocus
              value={whatWeSell}
              onChange={(e) => setWhatWeSell(e.target.value)}
              onKeyDown={(e) => handleTextareaKeyDown(e, goNext)}
              rows={5}
              className="resize-none"
            />
          </StepShell>
        )}

        {step === 2 && (
          <StepShell
            label="Target ICP"
            helper="Industry, company size, and the key decision maker."
            onBack={goBack}
            footer={
              <div className="flex items-center gap-3">
                <Button type="button" onClick={goNext}>
                  Continue
                </Button>
                <span className="text-xs text-muted-foreground">⌘/Ctrl + Enter</span>
              </div>
            }
          >
            <Textarea
              autoFocus
              value={targetIcp}
              onChange={(e) => setTargetIcp(e.target.value)}
              onKeyDown={(e) => handleTextareaKeyDown(e, goNext)}
              rows={5}
              className="resize-none"
            />
          </StepShell>
        )}

        {step === 3 && (
          <StepShell
            label="Value proposition"
            helper="The one thing you want every interview to reinforce."
            onBack={goBack}
            footer={
              <div className="flex items-center gap-3">
                <Button type="button" onClick={finish}>
                  Finish
                </Button>
                <span className="text-xs text-muted-foreground">⌘/Ctrl + Enter</span>
              </div>
            }
          >
            <Textarea
              autoFocus
              value={valueProp}
              onChange={(e) => setValueProp(e.target.value)}
              onKeyDown={(e) => handleTextareaKeyDown(e, finish)}
              rows={5}
              className="resize-none"
            />
          </StepShell>
        )}
      </div>
    </div>
  );
}
