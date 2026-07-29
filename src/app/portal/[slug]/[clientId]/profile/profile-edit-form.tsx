"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateClientProfileById } from "@/app/actions/portal";

interface ProfileEditFormProps {
  clientId: string;
  slug: string;
  initialData: {
    name: string;
    phone: string | null;
    email: string | null;
    birthday: string | null;
    preferences: {
      preferredStaff?: string;
      serviceNotes?: string;
      notifySms?: boolean;
      notifyEmail?: boolean;
    };
  };
  staffList: { id: string; name: string }[];
}

export function ProfileEditForm({
  clientId,
  slug,
  initialData,
  staffList,
}: ProfileEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initialData.name);
  const [phone, setPhone] = useState(initialData.phone ?? "");
  const [email, setEmail] = useState(initialData.email ?? "");
  const [birthday, setBirthday] = useState(
    initialData.birthday
      ? new Date(initialData.birthday).toISOString().slice(0, 10)
      : ""
  );

  // Preferences
  const [notifySms, setNotifySms] = useState(
    initialData.preferences.notifySms ?? true
  );
  const [notifyEmail, setNotifyEmail] = useState(
    initialData.preferences.notifyEmail ?? false
  );
  const [preferredStaff, setPreferredStaff] = useState(
    initialData.preferences.preferredStaff ?? ""
  );
  const [serviceNotes, setServiceNotes] = useState(
    initialData.preferences.serviceNotes ?? ""
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await updateClientProfileById(clientId, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        birthday: birthday || undefined,
        preferences: {
          notifySms,
          notifyEmail,
          preferredStaff: preferredStaff || undefined,
          serviceNotes: serviceNotes.trim() || undefined,
        },
      });

      if (result.success) {
        setSaved(true);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-stone-700 mb-3">
          Basic information
        </legend>

        <div>
          <label
            htmlFor="edit-name"
            className="block text-xs font-medium text-stone-600 mb-1"
          >
            Full name
          </label>
          <input
            id="edit-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>

        <div>
          <label
            htmlFor="edit-phone"
            className="block text-xs font-medium text-stone-600 mb-1"
          >
            Phone number
          </label>
          <input
            id="edit-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
            className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>

        <div>
          <label
            htmlFor="edit-email"
            className="block text-xs font-medium text-stone-600 mb-1"
          >
            Email address
          </label>
          <input
            id="edit-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>

        <div>
          <label
            htmlFor="edit-birthday"
            className="block text-xs font-medium text-stone-600 mb-1"
          >
            Birthday{" "}
            <span className="text-stone-400 font-normal">(optional)</span>
          </label>
          <input
            id="edit-birthday"
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>
      </fieldset>

      {/* Notification preferences */}
      <fieldset className="rounded-xl border border-stone-100 bg-stone-50 p-4 space-y-3">
        <legend className="text-sm font-semibold text-stone-700 px-1">
          Notification preferences
        </legend>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-medium text-stone-800">SMS reminders</p>
            <p className="text-xs text-stone-400">
              Appointment reminders via text
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={notifySms}
            onClick={() => setNotifySms((v) => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
              notifySms ? "bg-rose-500" : "bg-stone-200"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 ${
                notifySms ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-medium text-stone-800">Email reminders</p>
            <p className="text-xs text-stone-400">
              Appointment confirmations by email
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={notifyEmail}
            onClick={() => setNotifyEmail((v) => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
              notifyEmail ? "bg-rose-500" : "bg-stone-200"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 ${
                notifyEmail ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>
      </fieldset>

      {/* Preferences */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-stone-700">
          I prefer…
        </legend>

        {staffList.length > 0 && (
          <div>
            <label
              htmlFor="edit-staff"
              className="block text-xs font-medium text-stone-600 mb-1"
            >
              Preferred stylist
            </label>
            <select
              id="edit-staff"
              value={preferredStaff}
              onChange={(e) => setPreferredStaff(e.target.value)}
              className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
            >
              <option value="">No preference</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label
            htmlFor="edit-notes"
            className="block text-xs font-medium text-stone-600 mb-1"
          >
            Service notes{" "}
            <span className="text-stone-400 font-normal">(allergies, preferences, etc.)</span>
          </label>
          <textarea
            id="edit-notes"
            value={serviceNotes}
            onChange={(e) => setServiceNotes(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="e.g. sensitive scalp, prefer no fragrance…"
            className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
          />
          <p className="text-xs text-stone-400 text-right mt-0.5">
            {serviceNotes.length}/500
          </p>
        </div>
      </fieldset>

      {/* Error / success */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Profile saved successfully.
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="flex-1 rounded-lg bg-rose-500 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
        <a
          href={`/portal/${slug}/${clientId}`}
          className="rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
