import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Birdsong</h1>
        <p className="text-sm text-neutral-500">
          AI-moderated survey platform for B2B demand gen.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/admin/surveys/new"
          className="rounded bg-black px-4 py-2 text-sm text-white"
        >
          Create a new survey
        </Link>
        <Link
          href="/admin"
          className="rounded border px-4 py-2 text-sm text-neutral-900"
        >
          Admin
        </Link>
        <Link
          href="/admin/signup"
          className="rounded border px-4 py-2 text-sm text-neutral-900"
        >
          Sign up
        </Link>
        <Link
          href="/admin/profile"
          className="rounded border px-4 py-2 text-sm text-neutral-900"
        >
          Company Profile
        </Link>
        <Link
          href="/admin/roadmap"
          className="rounded border px-4 py-2 text-sm text-neutral-900"
        >
          Roadmap
        </Link>
      </div>
    </div>
  );
}
