import { spectral } from "@/lib/fonts";
import { cn } from "@/lib/utils";

// Full-screen flyby cutscene (design_handoff_loading/Loading Screen.dc.html)
// for waits expected to exceed ~2s. Fixed-position takeover so it can be
// dropped in as an overlay from anywhere (a route's loading.tsx, or mid-page
// while an admin action is in flight) without the caller needing to manage
// layout for it. Callers are responsible for gating (see useLoadingGate.ts):
// this component always renders when mounted.
export function LoadingScreen({
  statusText,
  speed = 1,
}: {
  // Per-context status line, e.g. "Preparing your conversation". No em
  // dashes, per the design handoff's copy rule.
  statusText: string;
  // Scales flight duration: dur = 3.4s / speed. 0.5-2.5 per the prototype's
  // own range.
  speed?: number;
}) {
  const dur = `${(3.4 / speed).toFixed(2)}s`;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        spectral.variable,
        "fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#faf8f1] font-sans text-[#241f18]"
      )}
      style={{
        backgroundImage: "radial-gradient(130% 90% at 50% -8%, rgba(233,166,116,.18), transparent 58%)",
      }}
    >
      {/* Bird flight, top-to-bottom decorative: the status text below is the
          actual accessible content of this role="status" region. */}
      <div
        aria-hidden="true"
        className="motion-reduce:hidden"
        style={{
          position: "absolute",
          top: "22%",
          left: 0,
          width: 0,
          height: 0,
          animation: `flyby ${dur} cubic-bezier(.45,.1,.4,.95) infinite`,
        }}
      >
        <div className="relative h-[59px] w-[64px]">
          <svg
            width="64"
            height="59"
            viewBox="0 0 50 44"
            fill="none"
            className="block"
            style={{ animation: "flap .32s ease-in-out infinite", transformOrigin: "50% 60%" }}
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M7 1.5 C9 9 15 13.6 23 14 C32 14.4 37.9 21 37.3 31 L45.3 34.6 L36.4 36.5 C34 39.5 30.5 41 26 41 L7 41 L17 28.5 C8 27.5 2 21.5 2 14 C2 8.5 4 4.5 7 1.5 Z M32 22.8 A1.9 1.9 0 1 0 32 26.9 A1.9 1.9 0 1 0 32 22.8 Z"
              fill="#241f18"
            />
          </svg>
          <span
            className="absolute text-[18px] text-[#3a6046]"
            style={{ top: 6, left: -18, opacity: 0, animation: `trailNote ${dur} ease infinite` }}
          >
            &#9834;
          </span>
          <span
            className="absolute text-[14px] text-[#a89d88]"
            style={{ top: 26, left: -30, opacity: 0, animation: `trailNote ${dur} ease .18s infinite` }}
          >
            &#9835;
          </span>
          <span
            className="absolute text-[15px] text-[#6f6757]"
            style={{ top: -8, left: -40, opacity: 0, animation: `trailNote ${dur} ease .36s infinite` }}
          >
            &#9834;
          </span>
        </div>
      </div>

      <div className="relative flex flex-col items-center gap-[22px]">
        <svg
          width="46"
          height="46"
          viewBox="0 0 512 512"
          fill="none"
          aria-hidden="true"
          className="motion-reduce:![animation:none]"
          style={{ animation: "markBreathe 2.8s ease-in-out infinite" }}
        >
          <polygon
            points="256,16 328,96 432,80 416,184 496,256 416,328 432,432 328,416 256,496 184,416 80,432 96,328 16,256 96,184 80,80 184,96"
            fill="#f5efd9"
            stroke="#241f18"
            strokeWidth="22"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            transform="translate(164.9 183.5) scale(3.6)"
            d="M7 1.5 C9 9 15 13.6 23 14 C32 14.4 37.9 21 37.3 31 L45.3 34.6 L36.4 36.5 C34 39.5 30.5 41 26 41 L7 41 L17 28.5 C8 27.5 2 21.5 2 14 C2 8.5 4 4.5 7 1.5 Z M32 22.8 A1.9 1.9 0 1 0 32 26.9 A1.9 1.9 0 1 0 32 22.8 Z"
            fill="#241f18"
          />
        </svg>

        <div className="font-spectral text-[30px] font-semibold tracking-[-0.005em]">Birdsong</div>

        <div className="flex items-center gap-2.5 text-[14.5px] text-[#6f6757]">
          <span>{statusText}</span>
          <span className="flex gap-1">
            <span
              className="h-[5px] w-[5px] rounded-full bg-[#3a6046] motion-reduce:![animation:none]"
              style={{ animation: "dotPulse 1.3s ease infinite" }}
            />
            <span
              className="h-[5px] w-[5px] rounded-full bg-[#3a6046] motion-reduce:![animation:none]"
              style={{ animation: "dotPulse 1.3s ease .18s infinite" }}
            />
            <span
              className="h-[5px] w-[5px] rounded-full bg-[#3a6046] motion-reduce:![animation:none]"
              style={{ animation: "dotPulse 1.3s ease .36s infinite" }}
            />
          </span>
        </div>
      </div>
    </div>
  );
}
