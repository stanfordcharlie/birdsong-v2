// The study page's in-place sections, shared by the server page (which reads
// ?tab= and must validate it) and the client view (which switches between
// them). Prospects is a tab too, but it is its own route, so it is never a
// value here.
//
// Deliberately its own module with no "use client" directive. StudyDetailView
// is a client component; a value imported from a "use client" file into a
// server component is a client reference, not the function, and calling it
// on the server throws `TypeError: ... is not a function` in the production
// bundle. Type imports are erased and were never the problem; isStudyTab was.
export const STUDY_TABS = ["responses", "report", "brief"] as const;
export type StudyTab = (typeof STUDY_TABS)[number];

export const DEFAULT_STUDY_TAB: StudyTab = "responses";

export function isStudyTab(value: unknown): value is StudyTab {
  return typeof value === "string" && (STUDY_TABS as readonly string[]).includes(value);
}

/** The tab a ?tab= value opens: itself when it names a section, otherwise the default. */
export function studyTabFromParam(value: unknown): StudyTab {
  return isStudyTab(value) ? value : DEFAULT_STUDY_TAB;
}
