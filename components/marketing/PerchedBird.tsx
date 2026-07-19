import { cn } from "@/lib/utils";

type PerchedBirdNote = {
  glyph: string;
  top: string;
  left: string;
  fontSize: string;
  delaySeconds: number;
};

// Existing marketing placement (ProductDemo's hero mockup): unchanged from
// before this component grew props, so that call site stays pixel-identical.
const DEFAULT_WRAPPER_CLASSNAME = "absolute -top-[34px] left-[72px] z-[2]";
const DEFAULT_NOTES: PerchedBirdNote[] = [
  { glyph: "♪", top: "-6px", left: "34px", fontSize: "15px", delaySeconds: 0 },
  { glyph: "♫", top: "2px", left: "42px", fontSize: "12px", delaySeconds: 1.1 },
  { glyph: "♪", top: "-10px", left: "48px", fontSize: "13px", delaySeconds: 2.2 },
];

// Reused (not redrawn) for the survey respondent intro's perched-on-the-form
// placement (design_handoff_survey_respondent) — same bird SVG and
// headBob/noteFloat keyframes, different size/position/notes for that
// context. Every prop defaults to the original marketing configuration, so
// existing zero-prop callers are unaffected.
export function PerchedBird({
  className = DEFAULT_WRAPPER_CLASSNAME,
  width = 40,
  height = 38,
  notes = DEFAULT_NOTES,
}: {
  className?: string;
  width?: number;
  height?: number;
  notes?: PerchedBirdNote[];
} = {}) {
  return (
    <div className={cn(className)}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 40 38"
        fill="none"
        aria-hidden="true"
        className="[transform-origin:60%_80%] motion-reduce:![animation:none]"
        style={{ animation: "headBob 5s ease-in-out infinite" }}
      >
        <path
          d="M8 25c0-7 5.2-13 12.3-13 3.2 0 5.2 1.3 6.5 3.2l5-1.4-2.9 4.7c.1.7.2 1.4.2 2.1 0 6.8-5.5 11.6-12.5 11.6H8l4.4-4.6C9.6 26.3 8 25 8 25Z"
          fill="#211D16"
        />
        <circle cx="24.7" cy="15.9" r="1.2" fill="#F5EFE3" />
        <path d="M27 14.5l4.5-1.2" stroke="#33684B" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      {notes.map((note, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="absolute font-newsreader text-[#33684B] motion-reduce:![animation:none]"
          style={{
            top: note.top,
            left: note.left,
            fontSize: note.fontSize,
            animation: `noteFloat 3.2s ease-out ${note.delaySeconds}s infinite`,
          }}
        >
          {note.glyph}
        </span>
      ))}
    </div>
  );
}
