"use client";

import { useSyncExternalStore } from "react";

// The date line and the time-of-day word in the Home hero, computed in the
// visitor's own timezone. The page is a server component and the server has
// no idea where the visitor is, so both values render once from the server
// clock and then correct themselves on the client. useSyncExternalStore is
// the one React API that lets the client value differ from the server one
// without a hydration mismatch: the server snapshot is used for hydration,
// then the client snapshot takes over in the same commit.

function subscribe() {
  return () => {};
}

export type TimeOfDay = "morning" | "afternoon" | "evening";

export function timeOfDay(date: Date): TimeOfDay {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

// "SAT · SEP 05". The uppercase comes from the eyebrow role, not the string.
export function formatDateLine(date: Date): string {
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.toLocaleDateString("en-US", { day: "2-digit" });
  return `${weekday} · ${month} ${day}`;
}

function useLocalNow(): Date {
  // Snapshots must be referentially stable per render or React loops, so
  // both return a primitive (the minute), not a Date.
  const minute = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 60_000),
    () => Math.floor(Date.now() / 60_000)
  );
  return new Date(minute * 60_000);
}

export function DateLine({ className }: { className?: string }) {
  const now = useLocalNow();
  return <span className={className}>{formatDateLine(now)}</span>;
}

export function TimeOfDayWord() {
  const now = useLocalNow();
  return <>{timeOfDay(now)}</>;
}
