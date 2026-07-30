"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export function DevBypassForm() {
  const [email, setEmail] = useState("admin@dev.local");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("dev-bypass", { email, callbackUrl, redirect: false });
    if (result?.error) {
      setError("No user found with that email.");
      setLoading(false);
    } else if (result?.url) {
      window.location.href = result.url;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#F48E16]"
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#F48E16] hover:bg-[#e07d08] disabled:opacity-50 text-white font-medium text-sm px-6 py-2.5 transition-colors duration-150"
      >
        {loading ? "Signing in…" : "Dev Sign In"}
      </button>
    </form>
  );
}
