"use client";

import { useEffect } from "react";

// Same fix as AdminShell's body effect: the browser paints rubber-band
// overscroll with <body>'s actual background (the legacy white), which
// flashed as a dead white band against the cream marketing canvas. Match
// the body to the canvas's outer tone (passed in by MarketingPageShell so
// it tracks the shell's tone) and disable the vertical bounce so the page
// simply stops at its edges. Scoped to marketing routes by
// mounting/unmounting with MarketingPageShell.
export function MarketingBodyEffects({ color }: { color: string }) {
  useEffect(() => {
    document.body.style.backgroundColor = color;
    document.documentElement.style.overscrollBehaviorY = "none";
    return () => {
      document.body.style.backgroundColor = "";
      document.documentElement.style.overscrollBehaviorY = "";
    };
  }, [color]);
  return null;
}
