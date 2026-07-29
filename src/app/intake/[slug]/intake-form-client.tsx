"use client";

import { useState, useTransition } from "react";
import type { IntakeField } from "@/app/actions/intake";
import { submitIntakeForm } from "@/app/actions/intake";
import { CheckCircle, Loader2 } from "lucide-react";

interface IntakeFormClientProps {
  salonName: string;
  salonLogo?: string | null;
  salonSlug: string;
  fields: IntakeField[];
}

export function IntakeFormClient({
  salonName,
  salonLogo,
  salonSlug,
  fields,
}: IntakeFormClientProps) {
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function setValue(id: string, val: string | boolean) {
    setValues((prev) => ({ ...prev, [id]: val }));
    setErrors((prev) => ({ ...prev, [id]: "" }));
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      if (field.required) {
        const val = values[field.id];
        if (val === undefined || val === "" || val === null) {
          newErrors[field.id] = `${field.label} is required`;
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    startTransition(async () => {
      setSubmitError(null);
      const payload: Record<string, unknown> = { ...values };
      const result = await submitIntakeForm(salonSlug, payload);
      if (result.success) {
        setSubmitted(true);
      } else {
        setSubmitError(result.error ?? "Something went wrong. Please try again.");
      }
    });
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">You&rsquo;re all set!</h2>
        <p className="text-gray-500 max-w-sm leading-relaxed">
          Thank you for registering with <strong>{salonName}</strong>. We&rsquo;ll see you soon!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-8">
        {salonLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={salonLogo}
            alt={salonName}
            className="w-16 h-16 rounded-2xl object-cover shadow-md mb-4"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-2xl shadow-md mb-4 select-none">
            {salonName.charAt(0).toUpperCase()}
          </div>
        )}
        <h1 className="text-2xl font-bold text-gray-900">{salonName}</h1>
        <h2 className="text-lg font-semibold text-gray-700 mt-1">New Client Registration</h2>
        <p className="text-sm text-gray-500 mt-1.5 leading-relaxed max-w-sm">
          Please fill out this short form before your first visit. It helps us provide the best service for you.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {fields.map((field) => {
          const val = values[field.id];
          const err = errors[field.id];

          return (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>

              {field.type === "text" && (
                <input
                  type="text"
                  value={typeof val === "string" ? val : ""}
                  onChange={(e) => setValue(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-amber-400/40 transition-shadow ${
                    err ? "border-red-400" : "border-gray-200 focus:border-amber-400"
                  }`}
                />
              )}

              {field.type === "longtext" && (
                <textarea
                  value={typeof val === "string" ? val : ""}
                  onChange={(e) => setValue(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-amber-400/40 transition-shadow resize-none ${
                    err ? "border-red-400" : "border-gray-200 focus:border-amber-400"
                  }`}
                />
              )}

              {field.type === "number" && (
                <input
                  type="number"
                  value={typeof val === "string" ? val : ""}
                  onChange={(e) => setValue(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-amber-400/40 transition-shadow ${
                    err ? "border-red-400" : "border-gray-200 focus:border-amber-400"
                  }`}
                />
              )}

              {field.type === "date" && (
                <input
                  type="date"
                  value={typeof val === "string" ? val : ""}
                  onChange={(e) => setValue(field.id, e.target.value)}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-amber-400/40 transition-shadow ${
                    err ? "border-red-400" : "border-gray-200 focus:border-amber-400"
                  }`}
                />
              )}

              {field.type === "boolean" && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={val === true}
                    onChange={(e) => setValue(field.id, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                  />
                  <span className="text-sm text-gray-700">{field.placeholder ?? "Yes"}</span>
                </label>
              )}

              {field.type === "choice" && field.options && (
                <div className="space-y-2">
                  {field.options.map((opt) => (
                    <label key={opt} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name={field.id}
                        value={opt}
                        checked={val === opt}
                        onChange={() => setValue(field.id, opt)}
                        className="w-4 h-4 border-gray-300 text-amber-500 focus:ring-amber-400"
                      />
                      <span className="text-sm text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {field.type === "dropdown" && field.options && (
                <select
                  value={typeof val === "string" ? val : ""}
                  onChange={(e) => setValue(field.id, e.target.value)}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-amber-400/40 transition-shadow ${
                    err ? "border-red-400" : "border-gray-200 focus:border-amber-400"
                  }`}
                >
                  <option value="">Select an option</option>
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}

              {err && <p className="mt-1 text-xs text-red-500">{err}</p>}
            </div>
          );
        })}

        {submitError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Registration"
          )}
        </button>
      </form>
    </div>
  );
}
