// Step 1 ("Invite") graphic (design_handoff_landing_pages_full): a green
// source node sending three dashed paths to three persona circles (one
// highlighted, mid-list), plus two floating "invited"/"accepted" chips.
// Identical structure on both pages — only the persona initials and chip
// copy differ.
export function InviteGraphic({
  personaTopInitials,
  personaMidInitials,
  personaBottomInitials,
  chipALabel,
  chipBLabel,
}: {
  personaTopInitials: string;
  personaMidInitials: string;
  personaBottomInitials: string;
  chipALabel: string;
  chipBLabel: string;
}) {
  return (
    <div className="relative flex h-[190px] items-center justify-center">
      <svg width="290" height="168" viewBox="0 0 290 168" fill="none" className="overflow-visible">
        <path
          d="M52 84 C 115 84 155 30 212 30"
          stroke="var(--lp-faint)"
          strokeWidth="1.4"
          strokeDasharray="4 6"
          className="motion-safe:animate-[lp-dash-flow_1.5s_linear_infinite]"
        />
        <path
          d="M52 84 H 212"
          stroke="var(--lp-green)"
          strokeWidth="1.4"
          strokeDasharray="4 6"
          opacity=".8"
          className="motion-safe:animate-[lp-dash-flow_1.5s_linear_0.4s_infinite]"
        />
        <path
          d="M52 84 C 115 84 155 138 212 138"
          stroke="var(--lp-faint)"
          strokeWidth="1.4"
          strokeDasharray="4 6"
          className="motion-safe:animate-[lp-dash-flow_1.5s_linear_0.8s_infinite]"
        />
        <circle cx="36" cy="84" r="15" fill="var(--lp-green)" />
        <text x="36" y="89" textAnchor="middle" fontSize="13" fill="var(--lp-bg)">
          &#9834;
        </text>
        <circle cx="228" cy="30" r="15" fill="var(--lp-surface)" stroke="var(--lp-border)" strokeWidth="1.5" />
        <text x="228" y="34" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--lp-muted)">
          {personaTopInitials}
        </text>
        <circle cx="228" cy="84" r="15" fill="var(--lp-green-bg)" stroke="var(--lp-green)" strokeWidth="1.5" />
        <text x="228" y="88" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--lp-green)">
          {personaMidInitials}
        </text>
        <circle cx="228" cy="138" r="15" fill="var(--lp-surface)" stroke="var(--lp-border)" strokeWidth="1.5" />
        <text x="228" y="142" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--lp-muted)">
          {personaBottomInitials}
        </text>
      </svg>
      <div className="absolute left-[8%] top-[26px] rounded-full border border-landing-border bg-landing-surface px-[13px] py-1.5 text-[12.5px] font-medium shadow-[0_2px_8px_rgba(38,32,25,.06)] motion-safe:animate-[lp-invite-chip-a_9s_ease_infinite]">
        {chipALabel}
      </div>
      <div className="absolute bottom-6 right-[6%] rounded-full border border-landing-border bg-landing-surface px-[13px] py-1.5 text-[12.5px] font-medium shadow-[0_2px_8px_rgba(38,32,25,.06)] motion-safe:animate-[lp-invite-chip-b_9s_ease_infinite]">
        {chipBLabel}
      </div>
    </div>
  );
}
