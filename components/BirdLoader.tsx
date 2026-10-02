// Small inline loader (design_handoff_loading/Mini Loader.dc.html) for
// in-flow waits of roughly 1-3s: between interview questions, button
// sending/saving states. Callers are responsible for gating (see
// useLoadingGate.ts) — this renders unconditionally whenever mounted.
export function BirdLoader({
  size = 26,
  label = true,
}: {
  // 18-48 per the prototype's own range. Button sending states use ~18.
  size?: number;
  // Shows "Thinking" + three pulsing dots next to the bird. Button usages
  // pass false (icon only); when false, the bird carries the accessible
  // name instead of relying on visible text.
  label?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-2.5 text-[#6f6757]"
      role={label ? undefined : "status"}
      aria-label={label ? undefined : "Loading"}
    >
      <span
        aria-hidden="true"
        className="relative motion-reduce:![animation:none]"
        style={{ width: size, height: size, animation: "miniBob 1.4s ease-in-out infinite" }}
      >
        <svg
          viewBox="0 0 50 44"
          fill="none"
          className="block motion-reduce:![animation:none]"
          // Explicit pixel style, not width/height attributes: some callers
          // (e.g. components/ui/button.tsx) apply `[&_svg]:size-4` to every
          // descendant svg, which as a CSS rule would otherwise beat plain
          // width/height attributes and force this to 16px regardless of
          // `size`. An inline style wins over an external class rule.
          style={{
            width: size,
            height: size,
            animation: "miniFlap .5s ease-in-out infinite",
            transformOrigin: "50% 60%",
          }}
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M7 1.5 C9 9 15 13.6 23 14 C32 14.4 37.9 21 37.3 31 L45.3 34.6 L36.4 36.5 C34 39.5 30.5 41 26 41 L7 41 L17 28.5 C8 27.5 2 21.5 2 14 C2 8.5 4 4.5 7 1.5 Z M32 22.8 A1.9 1.9 0 1 0 32 26.9 A1.9 1.9 0 1 0 32 22.8 Z"
            fill="#241f18"
          />
        </svg>
        <span
          className="absolute text-[12px] text-[#3a6046] motion-reduce:hidden"
          style={{ top: -7, right: -7, opacity: 0, animation: "miniNote 2.1s ease infinite" }}
        >
          &#9834;
        </span>
        <span
          className="absolute text-[10px] text-[#a89d88] motion-reduce:hidden"
          style={{ top: -2, right: -14, opacity: 0, animation: "miniNote 2.1s ease .7s infinite" }}
        >
          &#9835;
        </span>
      </span>
      {label && (
        <span className="flex items-center gap-[7px] text-[13.5px]">
          <span>Thinking</span>
          <span className="flex gap-[3px]">
            <span
              className="h-1 w-1 rounded-full bg-[#3a6046] motion-reduce:![animation:none]"
              style={{ animation: "miniDot 1.3s ease infinite" }}
            />
            <span
              className="h-1 w-1 rounded-full bg-[#3a6046] motion-reduce:![animation:none]"
              style={{ animation: "miniDot 1.3s ease .18s infinite" }}
            />
            <span
              className="h-1 w-1 rounded-full bg-[#3a6046] motion-reduce:![animation:none]"
              style={{ animation: "miniDot 1.3s ease .36s infinite" }}
            />
          </span>
        </span>
      )}
    </span>
  );
}
