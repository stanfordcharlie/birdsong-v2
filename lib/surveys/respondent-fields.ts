// Which optional respondent-info fields a survey collects, beyond the
// always-collected name/email. Stored on surveys.custom_fields (an
// otherwise-unused jsonb column already provisioned for per-survey
// configuration like this). Phone has its own `responses.respondent_phone`
// column; job title, company, and linkedin don't have dedicated columns,
// so they're stored in responses.custom_field_values.
export const OPTIONAL_RESPONDENT_FIELDS = ["phone", "job_title", "company", "linkedin"] as const;

export type OptionalRespondentField = (typeof OPTIONAL_RESPONDENT_FIELDS)[number];

export const OPTIONAL_RESPONDENT_FIELD_LABELS: Record<OptionalRespondentField, string> = {
  phone: "Phone number",
  job_title: "Job title",
  company: "Company name",
  linkedin: "LinkedIn URL",
};

function isPresetKey(key: string): key is OptionalRespondentField {
  return (OPTIONAL_RESPONDENT_FIELDS as readonly string[]).includes(key);
}

// An enabled preset is stored either as a bare key string (default label,
// or older data from before labels were editable) or as a {key, label}
// object once its label has been customized — same shape used for fully
// custom fields below. Either way, this just needs the key.
export function parseEnabledRespondentFields(customFields: unknown): OptionalRespondentField[] {
  if (!Array.isArray(customFields)) return [];
  return customFields
    .map((entry) => (typeof entry === "string" ? entry : (entry as { key?: unknown })?.key))
    .filter((key): key is OptionalRespondentField => typeof key === "string" && isPresetKey(key));
}

// Beyond the fixed presets above, an admin can define their own one-off
// respondent fields (e.g. "Team size"). Both these and label-customized
// presets live in the same surveys.custom_fields array as {key, label,
// required?} objects, no schema change needed since the column was
// already untyped jsonb. `required` defaults to false when absent, so
// existing data (saved before this field existed) stays non-required.
export type CustomRespondentFieldDef = {
  key: string;
  label: string;
  required?: boolean;
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

function isFieldDefShape(value: unknown): value is CustomRespondentFieldDef {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as CustomRespondentFieldDef).key === "string" &&
    typeof (value as CustomRespondentFieldDef).label === "string"
  );
}

// Looks up a saved label override for one preset field, falling back to
// its default label if it was never customized (or is stored as a bare key
// string, including all pre-existing surveys).
export function parsePresetFieldLabel(
  customFields: unknown,
  presetKey: OptionalRespondentField
): string {
  if (Array.isArray(customFields)) {
    const override = customFields.find(
      (entry): entry is CustomRespondentFieldDef => isFieldDefShape(entry) && entry.key === presetKey
    );
    if (override) return override.label;
  }
  return OPTIONAL_RESPONDENT_FIELD_LABELS[presetKey];
}

// Same lookup as parsePresetFieldLabel but for the required flag. Absent
// (bare key string, or an object that predates this field) means false,
// matching the field's original, always-optional behavior.
export function parsePresetFieldRequired(
  customFields: unknown,
  presetKey: OptionalRespondentField
): boolean {
  if (Array.isArray(customFields)) {
    const override = customFields.find(
      (entry): entry is CustomRespondentFieldDef => isFieldDefShape(entry) && entry.key === presetKey
    );
    if (override) return override.required === true;
  }
  return false;
}

// Fields the admin defined themselves, beyond the presets — object entries
// whose key isn't one of the preset keys (a label-customized preset is
// also stored as an object, but parsePresetFieldLabel handles those; this
// excludes them so they don't show up twice in the form's custom-field list).
export function parseCustomRespondentFieldDefs(customFields: unknown): CustomRespondentFieldDef[] {
  if (!Array.isArray(customFields)) return [];
  return customFields.filter(
    (entry): entry is CustomRespondentFieldDef => isFieldDefShape(entry) && !isPresetKey(entry.key)
  );
}
