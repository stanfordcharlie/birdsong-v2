"use client";

import Link from "next/link";
import {
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { bricolage } from "@/lib/fonts";
import { cn } from "@/lib/utils";

// Shared chrome + field primitives for the admin auth screens
// (design_handoff_auth). Same eggshell editorial system as the survey
// welcome/thanks screens: it reuses their sw-* reveal + ambient CSS
// (globals.css) so motion is consistent and honors prefers-reduced-motion.
// Presentation only — LoginForm / SignupForm own all auth behavior.

// The Birdsong bird mark, inked with an eggshell eye. Inlined (rather than the
// marketing BirdMark, whose fills read from landing tokens) so the fills are
// exact regardless of surrounding token context.
function AuthBird({ width, height, className }: { width: number; height: number; className?: string }) {
  return (
    <svg width={width} height={height} viewBox="0 0 48 44" fill="none" aria-hidden="true" className={className}>
      <path
        d="M10 40 L19.5 28.5 C11.5 27.5 5.5 21.5 5.5 13.5 C5.5 9.5 7.5 5.5 10.5 4.5 C11.5 10.5 16.5 13.5 22.5 13.5 C31.5 13.5 38.5 19.5 38.5 27.5 C38.5 29 38.2 30.4 37.6 31.8 L44.5 34.5 L36.5 35 C33.5 38.5 28.5 40.5 23 40.5 L14.5 40.5 Z"
        fill="#241f18"
      />
      <circle cx="33" cy="25.5" r="1.8" fill="#faf8f1" />
    </svg>
  );
}

export function AuthScreen({
  heading,
  subcopy,
  children,
  belowCard,
}: {
  heading: string;
  subcopy: string;
  children: ReactNode;
  belowCard?: ReactNode;
}) {
  return (
    <div
      className={cn(
        bricolage.variable,
        "relative flex min-h-screen flex-col overflow-x-hidden font-sans text-[#241f18]"
      )}
      style={{ background: "#faf8f1" }}
    >
      {/* Ambient layer: two radial washes, two drifting blurred blobs, four
          drifting note glyphs. aria-hidden, reuses the survey sw-* loops. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          background:
            "radial-gradient(760px 420px at 24% -8%, rgba(58,96,70,.09), transparent 60%), radial-gradient(760px 420px at 76% -10%, rgba(84,116,158,.09), transparent 60%)",
        }}
      >
        <div
          className="sw-blob-a absolute left-[6%] top-[-80px] h-[300px] w-[300px] rounded-full"
          style={{ background: "#e4ecdd", opacity: 0.5, filter: "blur(70px)" }}
        />
        <div
          className="sw-blob-b absolute right-[5%] top-[-60px] h-[280px] w-[280px] rounded-full"
          style={{ background: "#e4ebf4", opacity: 0.55, filter: "blur(70px)" }}
        />
        <span className="sw-bgnote-a absolute left-[13%] top-[16%] text-[19px]" style={{ color: "#3a6046", opacity: 0.4 }}>
          &#9834;
        </span>
        <span className="sw-bgnote-b absolute right-[17%] top-[11%] text-[16px]" style={{ color: "#54749e", opacity: 0.4 }}>
          &#9835;
        </span>
        <span className="sw-bgnote-c absolute right-[8%] top-[68%] text-[14px]" style={{ color: "#a89d88", opacity: 0.45 }}>
          &#9834;
        </span>
        <span className="sw-bgnote-d absolute left-[10%] top-[74%] text-[16px]" style={{ color: "#3a6046", opacity: 0.35 }}>
          &#9835;
        </span>
      </div>

      {/* Header: top-left logo lockup, links to the marketing landing. */}
      <header className="sw-rev relative px-9 py-[26px]">
        <Link href="/" className="inline-flex items-center gap-2.5 [@media(hover:hover)]:hover:text-[#3a6046]">
          <AuthBird width={22} height={20} className="sw-bird" />
          <span className="font-bricolage text-[20px] font-bold tracking-[-0.01em]">Birdsong</span>
        </Link>
      </header>

      <main className="relative flex flex-1 items-start justify-center px-6 pb-16 pt-7">
        <div className="flex w-full max-w-[430px] flex-col items-center">
          {/* Bobbing mascot with two rising notes. */}
          <div aria-hidden="true" className="sw-rev relative mb-1.5 h-16 w-[120px]">
            <span className="sw-clusternote-a absolute left-[26px] top-0 text-[16px]" style={{ color: "#3a6046", opacity: 0 }}>
              &#9834;
            </span>
            <span className="sw-clusternote-b absolute left-[66px] top-[14px] text-[13px]" style={{ color: "#a89d88", opacity: 0 }}>
              &#9835;
            </span>
            <AuthBird width={40} height={37} className="sw-bird absolute bottom-0 left-10" />
          </div>

          <h1
            className="sw-rev m-0 mb-2.5 text-balance text-center font-bricolage text-[36px] font-bold leading-[1.08] tracking-[-0.02em]"
            style={{ "--sw-delay": "0.06s" } as React.CSSProperties}
          >
            {heading}
          </h1>
          <div
            className="sw-rev mb-7 text-center text-[15px] text-[#6f6757]"
            style={{ "--sw-delay": "0.1s" } as React.CSSProperties}
          >
            {subcopy}
          </div>

          <div
            className="sw-rev w-full rounded-[22px] border border-[#e9e3d3] bg-[#fffefa] px-[34px] pb-[30px] pt-8 shadow-[0_4px_14px_rgba(38,32,25,0.06)]"
            style={{ "--sw-delay": "0.16s" } as React.CSSProperties}
          >
            {children}
          </div>

          {belowCard && (
            <div
              className="sw-rev mt-[22px] text-[14.5px] text-[#6f6757]"
              style={{ "--sw-delay": "0.24s" } as React.CSSProperties}
            >
              {belowCard}
            </div>
          )}
        </div>
      </main>

      <footer
        className="sw-rev relative flex flex-wrap items-center justify-center gap-x-[18px] gap-y-1.5 px-8 pb-[30px] pt-5 text-[13px] text-[#a89d88]"
        style={{ "--sw-delay": "0.3s" } as React.CSSProperties}
      >
        <span>&copy; 2026 Birdsong</span>
        <Link href="/terms" className="[@media(hover:hover)]:hover:text-[#6f6757]">
          Terms
        </Link>
        <Link href="/privacy" className="[@media(hover:hover)]:hover:text-[#6f6757]">
          Privacy
        </Link>
        <a href="mailto:charlie@usebirdsong.com" className="[@media(hover:hover)]:hover:text-[#6f6757]">
          Help
        </a>
      </footer>
    </div>
  );
}

// --- Field primitives -------------------------------------------------------

const INPUT_BASE =
  "w-full rounded-[11px] border border-[#e9e3d3] bg-[#faf8f1] text-[15px] text-[#241f18] placeholder:text-[#a89d88] transition-[border-color,box-shadow] duration-[160ms] focus:border-[#a89d88] focus:shadow-[0_0_0_3px_rgba(58,96,70,0.1)] focus:outline-none";

const LABEL_CLASS = "text-[13px] font-semibold text-[#6f6757]";

export function AuthField({
  label,
  className,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <input id={id} className={cn(INPUT_BASE, "px-[14px] py-3")} {...props} />
    </div>
  );
}

export function AuthPasswordField({
  label,
  value,
  onChange,
  helper,
  labelAccessory,
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  labelAccessory?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className={LABEL_CLASS}>
          {label}
        </label>
        {labelAccessory}
      </div>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(INPUT_BASE, "py-3 pl-[14px] pr-11")}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
          className="absolute right-1.5 top-1/2 flex -translate-y-1/2 p-2 text-[#a89d88] [@media(hover:hover)]:hover:text-[#6f6757]"
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
            <circle cx="12" cy="12" r="2.6" />
            {visible && <path d="M4 4l16 16" />}
          </svg>
        </button>
      </div>
      {helper && <div className="text-[12.5px] text-[#a89d88]">{helper}</div>}
    </div>
  );
}

// Error styled to the warm palette per the handoff — ink text on a subtle
// butter tone, no red-alert box.
export function AuthError({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-[10px] border border-[#e9dca9] bg-[#f7edcb]/70 px-3.5 py-2.5 text-[13.5px] leading-snug text-[#241f18]"
    >
      {children}
    </p>
  );
}

export function AuthSubmit({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="mt-1.5 w-full touch-manipulation rounded-full bg-[#241f18] px-6 py-[15px] text-[16px] font-semibold text-[#faf8f1] transition-[transform,box-shadow] duration-[250ms] disabled:cursor-not-allowed disabled:opacity-70 [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:enabled:shadow-[0_14px_30px_rgba(38,32,25,0.18)]"
      {...props}
    >
      {children}
    </button>
  );
}
