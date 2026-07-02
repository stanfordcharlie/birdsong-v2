"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { logLoginEvent } from "@/lib/auth-events";
import { PasswordInput } from "@/components/PasswordInput";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data.user) {
      await logLoginEvent(supabase, data.user.id, data.user.email ?? null);
    }
    // Full navigation so middleware re-reads the freshly set auth cookies.
    window.location.assign("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-xl font-semibold">Log in</h1>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded border bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400"
        />
        <PasswordInput
          name="password"
          placeholder="Password"
          value={password}
          onChange={setPassword}
          required
          className="rounded border bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
        <div className="flex flex-col items-center gap-1">
          <a href="/admin/signup" className="text-sm text-neutral-500 underline">
            Need an account? Sign up
          </a>
          <a href="/admin/forgot-password" className="text-sm text-neutral-500 underline">
            Forgot your password?
          </a>
        </div>
      </form>
    </div>
  );
}
