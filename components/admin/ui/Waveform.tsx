import { cn } from "@/lib/utils";
import { dot } from "./tokens";

// The same seed always draws the same wave, on the server and in the
// browser, so a study keeps its shape between renders and there is nothing
// to mismatch on hydration. FNV-1a to turn the seed into an integer,
// mulberry32 to walk it.
function hashSeed(seed: string | number): number {
  const input = String(seed);
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TONE = {
  light: dot.accent,
  ink: dot.accentBright,
  muted: dot.dashed,
} as const;

/**
 * The waveform: a row of vertical bars, wherever Birdsong is listening or has
 * listened. Brand language, not decoration.
 *
 * Heights are derived from `seed`, so pass something stable (a study id).
 * `live` makes the bars breathe, each on its own delay; it is for an
 * interview that is running now and nothing else. `tone` follows the ground:
 * `light` on white, `ink` on the ink card, `muted` for a study that is not
 * collecting.
 */
export function Waveform({
  seed,
  bars = 24,
  live = false,
  tone = "light",
  height = 24,
  className,
}: {
  seed: string | number;
  bars?: number;
  live?: boolean;
  tone?: "light" | "ink" | "muted";
  /** The tallest bar, in px. */
  height?: number;
  className?: string;
}) {
  const next = mulberry32(hashSeed(seed));
  const levels = Array.from({ length: Math.max(1, Math.floor(bars)) }, () => ({
    // 25% is the floor the live animation also rests at.
    level: 0.25 + next() * 0.75,
    delay: Math.round(next() * 1200),
  }));

  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center gap-[3px]", className)}
      style={{ height }}
    >
      {levels.map((bar, i) => (
        <span
          key={i}
          className={cn("block w-[3px] rounded-[var(--ds-radius-chip)]", TONE[tone], live && "ds-wave-bar")}
          style={
            {
              height: `${Math.round(bar.level * 100)}%`,
              "--ds-wave-delay": `-${bar.delay}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}
