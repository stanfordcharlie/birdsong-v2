import type { User } from "@supabase/supabase-js";

// first_name/last_name live in auth.users.user_metadata (set at signup,
// see SignupForm.tsx), not the profiles table — available immediately for
// every signed-in user, no profiles row required. Existing accounts that
// signed up before this field existed fall back to profiles.contact_name
// (set later, during company profile onboarding), then email.
function metadataName(user: User | null, key: "first_name" | "last_name"): string {
  const value = user?.user_metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
}

export function userFirstName(user: User | null, contactName?: string | null): string | null {
  const first = metadataName(user, "first_name");
  if (first) return first;
  const trimmed = contactName?.trim();
  if (trimmed) return trimmed.split(/\s+/)[0];
  return null;
}

export function userFullName(user: User | null, contactName?: string | null): string | null {
  const first = metadataName(user, "first_name");
  const last = metadataName(user, "last_name");
  if (first || last) return [first, last].filter(Boolean).join(" ");
  const trimmed = contactName?.trim();
  return trimmed || null;
}

export function userDisplayName(user: User | null, contactName?: string | null): string | null {
  return userFullName(user, contactName) || user?.email || null;
}
