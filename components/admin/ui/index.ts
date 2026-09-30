// The admin primitive set. Admin pages import from here.
//
// Import rule (DESIGN.md "Import boundaries"):
//   admin pages           -> components/admin/ui
//   respondent + marketing -> components/ui
// Neither side edits the other's copy. components/ui/{button,card,badge}.tsx
// are intentionally forked from these, because the respondent survey,
// NewStudyWizard and the marketing pages still consume them and are out of
// scope for the admin design pass.
//
// Colours, radii and shadows come from ./tokens, which spells the Ledger II
// custom properties as class names; type comes from the .ds-* utilities in
// app/globals.css.

export { PageShell } from "./PageShell";
export { PageHeader } from "./PageHeader";
export { Button, adminButtonVariants, type AdminButtonProps } from "./Button";
export { Card } from "./Card";
export { StatRow, type Stat } from "./StatRow";
export { FilterTabs, type FilterTab } from "./FilterTabs";
export { SectionTabs, type SectionTab } from "./SectionTabs";
export { SearchInput } from "./SearchInput";
export {
  DataTable,
  StackedCell,
  type Column,
  type ColumnWidth,
  type SortDirection,
  type SortState,
} from "./DataTable";
export { useTableSort } from "./useTableSort";
export { EmptyState } from "./EmptyState";
export { SelectBox } from "./SelectBox";
export {
  Badge,
  BADGE_STATES,
  LEAD_STATUS_BADGE_STATE,
  adminBadgeVariants,
  type AdminBadgeProps,
  type BadgeState,
} from "./Badge";
export { StatusDot } from "./StatusDot";
export { ScoreChip } from "./ScoreChip";
export { ScoreBadge } from "./ScoreBadge";
export { RelativeTime } from "./RelativeTime";
export { CollapsibleSection } from "./CollapsibleSection";
export { FloatingBar, FloatingBarButton } from "./FloatingBar";
export { Waveform } from "./Waveform";
export { PageTopBar, Crumbs, TopBarContent, TopBarSlotContext, type Crumb } from "./PageTopBar";
export { ChatInput } from "./ChatInput";
