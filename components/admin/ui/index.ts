// The admin primitive set. Admin pages import from here.
//
// Import rule (DESIGN.md "Import boundaries"):
//   admin pages           -> components/admin/ui
//   respondent + marketing -> components/ui
// Neither side edits the other's copy. components/ui/{button,card,badge}.tsx
// are intentionally forked from these, because the respondent survey,
// NewSurveyWizard and the marketing pages still consume them and are out of
// scope for the admin design pass.

export { PageShell } from "./PageShell";
export { PageHeader } from "./PageHeader";
export { Button, adminButtonVariants, type AdminButtonProps } from "./Button";
export { Card } from "./Card";
export { StatRow, type Stat } from "./StatRow";
export { FilterTabs, type FilterTab } from "./FilterTabs";
export { SearchInput } from "./SearchInput";
export { DataTable, type Column } from "./DataTable";
export { EmptyState } from "./EmptyState";
export { Badge, adminBadgeVariants, type AdminBadgeProps } from "./Badge";
export { StatusDot } from "./StatusDot";
