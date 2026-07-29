"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PhoneSearchForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = phone.trim();
    if (!trimmed) return;
    router.push(`/portal/${slug}?phone=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="portal-phone"
          className="block text-sm font-medium text-stone-700 mb-1"
        >
          Your phone number
        </label>
        <input
          id="portal-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 (555) 000-0000"
          className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-400"
          required
        />
      </div>

      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 transition-colors shadow-sm shadow-rose-200"
      >
        Find my appointments
      </button>
    </form>
  );
}
