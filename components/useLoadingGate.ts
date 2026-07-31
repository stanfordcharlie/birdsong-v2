"use client";

import { useEffect, useState } from "react";

// design_handoff_loading's gating rule: show nothing for the first ~300ms of
// any wait (avoids flicker on fast responses), the mini loader after that,
// full screen only when the wait class is known-long. This hook implements
// the shared "nothing for ~300ms, then show" half of that rule; callers pick
// LoadingScreen or BirdLoader based on which wait class they're gating.
const GATE_DELAY_MS = 300;

export function useLoadingGate(isLoading: boolean, delayMs: number = GATE_DELAY_MS): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [isLoading, delayMs]);

  return visible;
}

function sessionFlybyKey(key: string): string {
  return `bs-flyby-shown:${key}`;
}

// Same 300ms gate, plus "consider showing the full cutscene at most once per
// session for the same wait type" — repeat waits of the same kind within a
// session skip the takeover (so it never feels like a gimmick on a second
// visit) and fall back to whatever the caller renders when this returns
// false, e.g. an existing skeleton.
export function useFlybyGate(isLoading: boolean, sessionKey: string): boolean {
  const delayed = useLoadingGate(isLoading);
  const [alreadyShown, setAlreadyShown] = useState(
    () => typeof window !== "undefined" && window.sessionStorage.getItem(sessionFlybyKey(sessionKey)) === "1"
  );

  useEffect(() => {
    if (delayed && !alreadyShown) {
      window.sessionStorage.setItem(sessionFlybyKey(sessionKey), "1");
      setAlreadyShown(true);
    }
  }, [delayed, alreadyShown, sessionKey]);

  return delayed && !alreadyShown;
}
