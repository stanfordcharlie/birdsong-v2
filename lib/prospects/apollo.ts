// Apollo CSV column mapping.
//
// Apollo's export headers are not stable: they differ by export type (people
// search vs a saved list vs a CRM-enriched pull), by account age, and by
// whichever columns the operator ticked before downloading. So nothing here
// matches a fixed header set. Each field declares the header spellings it
// accepts, in priority order, and the first one present in the file wins.
//
// Anything not claimed by a field below is kept in `firmographics` rather
// than dropped. That is deliberate: Apollo's value is mostly in the columns
// we have not thought of yet (headcount, industry, technologies, intent
// signals), and an import that silently discards them makes the table worse
// than the CSV it came from.

// Header keys are compared in a normalized form: lowercased, with every run
// of non-alphanumeric characters folded to a single space. That makes
// "First Name", "first_name", "FIRST NAME" and "First-Name" the same key,
// and turns "# Employees" into "employees".
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Priority order matters within each list: "person linkedin url" is checked
// before "linkedin url" so a file carrying both a person and a company
// LinkedIn column binds the person's.
const FIELD_ALIASES = {
  first_name: ["first name", "firstname", "first", "given name"],
  last_name: ["last name", "lastname", "last", "surname", "family name"],
  email: ["email", "email address", "work email", "primary email", "person email", "contact email"],
  title: ["title", "job title", "position", "headline", "person title"],
  company_name: [
    "company",
    "company name",
    "company name for emails",
    "organization",
    "organization name",
    "account name",
    "employer",
  ],
  company_domain: [
    "website",
    "company website",
    "domain",
    "company domain",
    "primary domain",
    "website url",
    "company url",
  ],
  linkedin_url: [
    "person linkedin url",
    "person linkedin",
    "linkedin url",
    "linkedin",
    "linkedin profile",
    "linkedin profile url",
  ],
  apollo_id: ["apollo contact id", "apollo id", "apollo person id", "contact id", "person id"],
} as const;

export type MappedField = keyof typeof FIELD_ALIASES;

// A company's LinkedIn page is not the person's, and "company linkedin url"
// would otherwise match the "linkedin" alias on a loose comparison. Excluded
// explicitly so it falls through to firmographics, where it is still useful
// and no longer pretending to be the contact.
const PERSON_LINKEDIN_EXCLUSIONS = ["company linkedin url", "company linkedin", "account linkedin"];

export type ColumnMapping = {
  /** Mapped field -> the exact header from the file that filled it. */
  fields: Partial<Record<MappedField, string>>;
  /** Headers that matched nothing and will be stored in firmographics. */
  unmapped: string[];
};

// Decides, once per file, which column feeds which field. Done on the header
// row rather than per data row so the mapping can be reported back to the
// operator: an import that guessed wrong is only debuggable if it says what
// it guessed.
export function buildColumnMapping(headers: string[]): ColumnMapping {
  const normalized = headers.map(normalizeHeader);
  const fields: Partial<Record<MappedField, string>> = {};
  const claimed = new Set<number>();

  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [MappedField, readonly string[]][]) {
    for (const alias of aliases) {
      const index = normalized.findIndex(
        (header, idx) =>
          !claimed.has(idx) &&
          header === alias &&
          !(field === "linkedin_url" && PERSON_LINKEDIN_EXCLUSIONS.includes(header))
      );
      if (index !== -1) {
        fields[field] = headers[index];
        claimed.add(index);
        break;
      }
    }
  }

  const unmapped = headers.filter((header, idx) => !claimed.has(idx) && header.trim() !== "");
  return { fields, unmapped };
}

// Apollo's website column is a URL ("http://www.acme.com/", "acme.com/about").
// The column stores a bare host, because that is what it is compared and
// matched on. Returns null rather than a half-parsed value when there is no
// host to find.
export function normalizeDomain(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const withoutScheme = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  const host = withoutScheme.split(/[/?#]/)[0].replace(/^www\./i, "").trim().toLowerCase();
  if (!host || !host.includes(".")) return null;
  return host;
}

// Deliberately permissive: this rejects a blank, a stray "N/A" and a value
// with no @ or no dot, which is what "skipped invalid" is counting. It is
// not an attempt to decide whether a mailbox exists.
export function isImportableEmail(value: string | undefined): boolean {
  const email = value?.trim();
  if (!email) return false;
  if (/\s/.test(email)) return false;
  return /^[^@]+@[^@]+\.[^@]{2,}$/.test(email);
}
