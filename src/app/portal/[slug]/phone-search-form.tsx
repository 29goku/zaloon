"use client";

import { useTransition } from "react";
import { portalPhoneLookup } from "./lookup-action";

export function PhoneSearchForm({ slug }: { slug: string }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const phone = (form.elements.namedItem("phone") as HTMLInputElement).value.trim();
    if (!phone) return;
    startTransition(() => {
      portalPhoneLookup(slug, phone);
    });
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
          name="phone"
          type="tel"
          placeholder="+1 (555) 000-0000"
          className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-400"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 transition-colors shadow-sm shadow-rose-200 disabled:opacity-60"
      >
        {isPending ? "Looking up…" : "Find my appointments"}
      </button>
    </form>
  );
}
