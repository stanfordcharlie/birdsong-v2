// Which optional respondent-info fields a survey collects, beyond the
// always-collected name/email. Stored on surveys.custom_fields (an
// otherwise-unused jsonb column already provisioned for per-survey
// configuration like this) as an array of these keys. Phone has its own
// `responses.respondent_phone` column; job title and company don't have
// dedicated columns, so they're stored in responses.custom_field_values.
export const OPTIONAL_RESPONDENT_FIELDS = ["phone", "job_title", "company"] as const;

export type OptionalRespondentField = (typeof OPTIONAL_RESPONDENT_FIELDS)[number];

export const OPTIONAL_RESPONDENT_FIELD_LABELS: Record<OptionalRespondentField, string> = {
  phone: "Phone number",
  job_title: "Job title",
  company: "Company name",
};

export function parseEnabledRespondentFields(customFields: unknown): OptionalRespondentField[] {
  if (!Array.isArray(customFields)) return [];
  return customFields.filter((field): field is OptionalRespondentField =>
    (OPTIONAL_RESPONDENT_FIELDS as readonly string[]).includes(field)
  );
}
