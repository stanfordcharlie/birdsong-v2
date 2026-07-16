import { createClient } from "@/lib/supabase/client";

const BUCKET = "company-logos";

// Objects live at `<user_id>/logo-<timestamp>.<ext>`, the storage RLS
// policies check that first path segment against auth.uid(), so every
// caller must be uploading as the profile's own owner.
export async function uploadCompanyLogo(userId: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${userId}/logo-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Best-effort: a failed delete just leaves an orphaned object in storage,
// not a broken profile, so callers don't need to surface this as an error.
export async function deleteCompanyLogo(logoUrl: string): Promise<void> {
  const supabase = createClient();
  const marker = `/object/public/${BUCKET}/`;
  const idx = logoUrl.indexOf(marker);
  if (idx === -1) return;
  const path = logoUrl.slice(idx + marker.length);
  await supabase.storage.from(BUCKET).remove([path]);
}
