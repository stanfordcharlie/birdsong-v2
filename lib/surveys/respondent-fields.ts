// Which optional respondent-info fields a survey collects, beyond the
// always-collected name/email. Stored on surveys.custom_fields (an
// otherwise-unused jsonb column already provisioned for per-survey
// configuration like this) as an array of these keys. Phone has its own
// `responses.respondent_phone` column; job title and company don't have
// dedicated columns, so they're stored in responses.custom_field_values.
export const OPTIONAL_RESPONDENT_FIELDS = ["phone", "job_title", "company", "linkedin"] as const;

export type OptionalRespondentField = (typeof OPTIONAL_RESPONDENT_FIELDS)[number];

export const OPTIONAL_RESPONDENT_FIELD_LABELS: Record<OptionalRespondentField, string> = {
  phone: "Phone number",
  job_title: "Job title",
  company: "Company name",
  linkedin: "LinkedIn URL",
};

export function parseEnabledRespondentFields(customFields: unknown): OptionalRespondentField[] {
  if (!Array.isArray(customFields)) return [];
  return customFields.filter((field): field is OptionalRespondentField =>
    (OPTIONAL_RESPONDENT_FIELDS as readonly string[]).includes(field)
  );
}

// Beyond the fixed presets above, an admin can define their own one-off
// respondent fields (e.g. "Team size"). These live in the same
// surveys.custom_fields array as plain {key, label} objects, alongside the
// preset entries (which stay bare strings) — no schema change needed since
// the column was already untyped jsonb.
export type CustomRespondentFieldDef = {
  key: string;
  label: string;
};

const CUSTOM_FIELD_KEY_PREFIX = "custom_";

// Prefixed so a custom field's key can never collide with a preset key
// (e.g. an admin naming a custom field "Company").
export function slugifyCustomFieldKey(label: string): string {
  const base = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${CUSTOM_FIELD_KEY_PREFIX}${base || "field"}`;
}

function isCustomFieldDef(value: unknown): value is CustomRespondentFieldDef {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as CustomRespondentFieldDef).key === "string" &&
    typeof (value as CustomRespondentFieldDef).label === "string"
  );
}

export function parseCustomRespondentFieldDefs(customFields: unknown): CustomRespondentFieldDef[] {
  if (!Array.isArray(customFields)) return [];
  return customFields.filter(isCustomFieldDef);
}
