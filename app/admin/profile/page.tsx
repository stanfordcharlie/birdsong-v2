import { redirect } from "next/navigation";

// The company profile is a Settings section now. This address is kept so old
// links and bookmarks still land on it.
export default function ProfilePage() {
  redirect("/admin/settings/profile");
}
