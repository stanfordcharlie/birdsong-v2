import { ScoreChip } from "./ScoreChip";

/**
 * The older name for a lead score chip, kept so its call sites compile.
 * New work imports ScoreChip, which also covers fit scores and the hero tile.
 */
export function ScoreBadge({
  score,
  size = "md",
  className,
}: {
  score: number | null | undefined;
  /** md is the table chip. sm is for dense inline contexts. */
  size?: "sm" | "md";
  className?: string;
}) {
  return <ScoreChip score={score} size={size === "sm" ? "sm" : "default"} className={className} />;
}
