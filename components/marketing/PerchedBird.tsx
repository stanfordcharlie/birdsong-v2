export function PerchedBird() {
  return (
    <div className="absolute -top-[34px] left-[72px] z-[2]">
      <svg
        width="40"
        height="38"
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
      <span
        aria-hidden="true"
        className="absolute -top-1.5 left-[34px] font-newsreader text-[15px] text-[#33684B] motion-reduce:![animation:none]"
        style={{ animation: "noteFloat 3.2s ease-out infinite" }}
      >
        ♪
      </span>
      <span
        aria-hidden="true"
        className="absolute top-0.5 left-[42px] font-newsreader text-xs text-[#33684B] motion-reduce:![animation:none]"
        style={{ animation: "noteFloat 3.2s ease-out 1.1s infinite" }}
      >
        ♫
      </span>
      <span
        aria-hidden="true"
        className="absolute -top-2.5 left-12 font-newsreader text-[13px] text-[#33684B] motion-reduce:![animation:none]"
        style={{ animation: "noteFloat 3.2s ease-out 2.2s infinite" }}
      >
        ♪
      </span>
    </div>
  );
}
