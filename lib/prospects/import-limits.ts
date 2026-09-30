// What the prospect import accepts, in one place, because two sides have to
// agree on it: the route enforces it (app/api/prospects/import/route.ts) and
// the page checks it before spending an upload on a file that will be
// refused. A number that only lived in the route would drift.
//
// Client-safe: constants and strings, no imports.

/** Matches the route's own ceiling. A normal Apollo list pull is far under it. */
export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;

export const MAX_IMPORT_FILE_LABEL = "10 MB";

/** The extension is the reliable half of the test. */
export const CSV_EXTENSIONS = [".csv"] as const;

/**
 * The unreliable half. A .csv file arrives as text/csv from most browsers,
 * as application/vnd.ms-excel from Windows where Excel owns the extension,
 * and as an empty string often enough (a file dragged from some archive
 * tools, or any browser that cannot guess) that an empty type has to pass.
 * So the MIME type can only ever reject a type that is positively wrong.
 */
export const CSV_MIME_TYPES = [
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "",
] as const;

export const CSV_ACCEPT = { extensions: CSV_EXTENSIONS, mimeTypes: CSV_MIME_TYPES };

/** The `accept` attribute for the hidden file input, from the same source. */
export const CSV_INPUT_ACCEPT = ".csv,text/csv";
