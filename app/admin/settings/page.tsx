import { redirect } from "next/navigation";

// Settings has no page of its own: it opens on the first section.
export default function SettingsPage() {
  redirect("/admin/settings/profile");
}
