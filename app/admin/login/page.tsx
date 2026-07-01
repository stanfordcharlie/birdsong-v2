export default function AdminLoginPage() {
  // TODO: wire up Supabase Auth (email/password or magic link).
  return (
    <div className="flex min-h-screen items-center justify-center">
      <form className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-xl font-semibold">Log in</h1>
        <input
          type="email"
          name="email"
          placeholder="Email"
          className="rounded border px-3 py-2"
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          className="rounded border px-3 py-2"
        />
        <button type="submit" className="rounded bg-black px-3 py-2 text-white">
          Log in
        </button>
      </form>
    </div>
  );
}
