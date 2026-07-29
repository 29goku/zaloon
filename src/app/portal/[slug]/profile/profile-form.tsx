"use client";

import { useState } from "react";
import { updateClientProfile } from "@/app/actions/portal";

type FormState =
  | { phase: "lookup" }
  | { phase: "edit" }
  | { phase: "saved" };

export function ProfileForm({ slug }: { slug: string }) {
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<FormState>({ phase: "lookup" });
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  // Edit form fields (populated after lookup)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;

    setLookupLoading(true);
    setLookupError(null);

    try {
      const res = await fetch(
        `/portal/${slug}/profile/api?phone=${encodeURIComponent(phone.trim())}`
      );
      const data = await res.json();

      if (!res.ok || data.error) {
        setLookupError(data.error ?? "Phone number not found.");
        return;
      }

      setName(data.name ?? "");
      setEmail(data.email ?? "");
      setBirthday(data.birthday ?? "");
      setState({ phase: "edit" });
    } catch {
      setLookupError("Network error. Please try again.");
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaveLoading(true);
    setSaveError(null);

    const result = await updateClientProfile(phone.trim(), {
      name: name.trim(),
      email: email.trim(),
      birthday: birthday.trim(),
    });

    setSaveLoading(false);

    if (result.success) {
      setState({ phase: "saved" });
    } else {
      setSaveError(result.error ?? "Failed to save changes.");
    }
  }

  if (state.phase === "saved") {
    return (
      <div className="rounded-xl border border-green-100 bg-green-50 px-6 py-8 text-center">
        <svg
          className="w-10 h-10 text-green-500 mx-auto mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <p className="font-semibold text-stone-900 mb-1">Profile updated!</p>
        <p className="text-sm text-stone-500">Your changes have been saved.</p>
      </div>
    );
  }

  if (state.phase === "lookup") {
    return (
      <form onSubmit={handleLookup} className="space-y-4">
        <div>
          <label
            htmlFor="profile-phone"
            className="block text-sm font-medium text-stone-700 mb-1"
          >
            Phone number
          </label>
          <input
            id="profile-phone"
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setLookupError(null);
            }}
            placeholder="+1 (555) 000-0000"
            className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-400"
            required
          />
          <p className="text-xs text-stone-400 mt-1">
            We&apos;ll use this to find your account.
          </p>
        </div>

        {lookupError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {lookupError}
          </div>
        )}

        <button
          type="submit"
          disabled={lookupLoading || !phone.trim()}
          className="w-full rounded-lg bg-rose-500 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 transition-colors disabled:opacity-50"
        >
          {lookupLoading ? "Looking up…" : "Find my profile"}
        </button>
      </form>
    );
  }

  // Edit phase
  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <label
          htmlFor="edit-name"
          className="block text-sm font-medium text-stone-700 mb-1"
        >
          Full name
        </label>
        <input
          id="edit-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-400"
          required
        />
      </div>

      <div>
        <label
          htmlFor="edit-email"
          className="block text-sm font-medium text-stone-700 mb-1"
        >
          Email address
        </label>
        <input
          id="edit-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
      </div>

      <div>
        <label
          htmlFor="edit-birthday"
          className="block text-sm font-medium text-stone-700 mb-1"
        >
          Birthday{" "}
          <span className="text-stone-400 font-normal">(optional)</span>
        </label>
        <input
          id="edit-birthday"
          type="date"
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
          className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
      </div>

      {saveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {saveError}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={saveLoading || !name.trim()}
          className="flex-1 rounded-lg bg-rose-500 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 transition-colors disabled:opacity-50"
        >
          {saveLoading ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => setState({ phase: "lookup" })}
          className="rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
        >
          Back
        </button>
      </div>
    </form>
  );
}
