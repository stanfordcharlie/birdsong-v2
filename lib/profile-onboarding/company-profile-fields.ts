// Shared between the client-side Company Profile page and the server-side
// AI edit endpoint. Kept dependency-free (no Anthropic SDK import) since
// the client component pulls this in directly — anything importing
// server-only code here would drag Node built-ins into the browser bundle.
export type CompanyProfileEditFields = {
  companyName: string;
  industry: string;
  website: string;
  teamSize: string;
  whatWeSell: string;
  targetIcp: string;
  valueProp: string;
  brandVoice: string;
};

// The full set of fields the onboarding wizard collects (CompanyProfileSetupFlow.tsx's
// STEPS), used by the "fill this out with your AI" flow (lib/profile-onboarding/paste-extract.ts)
// to build the copyable prompt and the extraction tool schema. `key` matches
// the wizard's own field keys and the `setupInitialData` shape built in
// app/admin/profile/page.tsx; `column` is the real profiles column. Separate
// from CompanyProfileEditFields above (a narrower, older subset used only by
// the "Edit with AI" instruction-based editor) — if the wizard's STEPS ever
// gain, lose, or rename a field, mirror the change here too.
export type PasteExtractionField = {
  key: string;
  column: string;
  section: string;
  // The exact heading the copyable prompt asks the admin's own AI to answer
  // under, and the label used to describe the field to our own extraction
  // model.
  promptHeading: string;
};

export const PASTE_EXTRACTION_FIELDS: PasteExtractionField[] = [
  { key: "companyName", column: "company_name", section: "Basics", promptHeading: "Company name" },
  { key: "industry", column: "industry", section: "Basics", promptHeading: "Industry" },
  { key: "teamSize", column: "team_size", section: "Basics", promptHeading: "Team size" },
  { key: "website", column: "website", section: "Web presence", promptHeading: "Website" },
  { key: "linkedin", column: "linkedin", section: "Web presence", promptHeading: "LinkedIn" },
  { key: "description", column: "what_we_sell", section: "What you sell", promptHeading: "What we sell" },
  {
    key: "audience",
    column: "target_icp",
    section: "Audience",
    promptHeading: "Who buys it, their roles, and target company size",
  },
  { key: "valueProp", column: "value_prop", section: "Value proposition", promptHeading: "Value proposition" },
  { key: "tone", column: "tone", section: "Brand voice", promptHeading: "Brand voice" },
  { key: "avoid", column: "words_to_avoid", section: "Brand voice", promptHeading: "Words or phrases to avoid" },
  { key: "contactName", column: "contact_name", section: "Contact", promptHeading: "Contact name" },
  { key: "contactEmail", column: "contact_email", section: "Contact", promptHeading: "Contact email" },
];

// Pure and dependency-free like the rest of this file (see the note up top)
// so the "fill this out with your AI" screen (a client component) can build
// the copyable prompt without dragging the Anthropic SDK, and therefore
// Node built-ins, into the browser bundle. The actual extraction call lives
// in paste-extract.ts instead, which is server-only.
export function buildPasteExtractionPrompt(): string {
  const headings = PASTE_EXTRACTION_FIELDS.map((f) => f.promptHeading).join("\n");
  return `You're helping me fill out my company profile in a product called Birdsong. Using what you already know about my company from our conversation history, answer the questions below about it.

If you do not know the answer to one, write UNKNOWN under that heading instead of guessing.

Answer under these exact headings, one per line, with your answer underneath each:

${headings}`;
}
