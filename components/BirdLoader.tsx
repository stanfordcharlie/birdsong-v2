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
          viewBox="0 0 48 44"
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
            d="M10 40 L19.5 28.5 C11.5 27.5 5.5 21.5 5.5 13.5 C5.5 9.5 7.5 5.5 10.5 4.5 C11.5 10.5 16.5 13.5 22.5 13.5 C31.5 13.5 38.5 19.5 38.5 27.5 C38.5 29 38.2 30.4 37.6 31.8 L44.5 34.5 L36.5 35 C33.5 38.5 28.5 40.5 23 40.5 L14.5 40.5 Z"
            fill="#241f18"
          />
          <circle cx="33" cy="25.5" r="1.8" fill="#faf8f1" />
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
