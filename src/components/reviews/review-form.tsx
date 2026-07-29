"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createReview } from "@/app/actions/reviews";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewFormProps {
  appointmentId: string;
  clientId?: string;
  staffId?: string;
  staffName?: string;
  salonName: string;
  salonSlug: string;
}

type Step = "overall" | "categories" | "details" | "thankyou";

interface CategoryRatings {
  serviceRating: number;
  cleanlinessRating: number;
  staffRating: number;
  valueRating: number;
}

// ─── Star widget ──────────────────────────────────────────────────────────────

function StarPicker({
  value,
  onChange,
  size = "lg",
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "md" | "lg" | "xl";
  label?: string;
}) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  const sizeClass = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  }[size];

  const ratingLabels: Record<number, string> = {
    1: "Poor",
    2: "Fair",
    3: "Good",
    4: "Great",
    5: "Excellent",
  };

  return (
    <div>
      {label && (
        <p className="text-sm font-medium text-stone-600 mb-2">{label}</p>
      )}
      <div
        className="flex gap-1"
        role="radiogroup"
        aria-label={label ?? "Star rating"}
        onMouseLeave={() => setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star !== 1 ? "s" : ""}`}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded transition-transform duration-75"
            style={{ transform: star <= display ? "scale(1.08)" : "scale(1)" }}
            onMouseEnter={() => setHovered(star)}
            onClick={() => onChange(star)}
          >
            <svg
              viewBox="0 0 24 24"
              className={`${sizeClass} transition-colors duration-100 ${
                star <= display
                  ? "text-amber-400 fill-amber-400"
                  : "text-stone-200 fill-stone-200"
              }`}
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        ))}
      </div>
      {size !== "sm" && display > 0 && (
        <p className="text-sm font-semibold text-amber-500 mt-1.5">
          {ratingLabels[display]}
        </p>
      )}
    </div>
  );
}

// ─── Step indicator ────────────────────────────────────────────────────────────

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? "w-6 h-2 bg-rose-500"
              : i < current
              ? "w-2 h-2 bg-rose-300"
              : "w-2 h-2 bg-stone-200"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Category rating row ──────────────────────────────────────────────────────

function CategoryRow({
  label,
  icon,
  value,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-stone-100 last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-stone-400 shrink-0">{icon}</span>
        <span className="text-sm font-medium text-stone-700 leading-tight">{label}</span>
      </div>
      <StarPicker value={value} onChange={onChange} size="sm" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReviewForm({
  appointmentId,
  clientId,
  staffId,
  staffName,
  salonName,
  salonSlug,
}: ReviewFormProps) {
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("overall");
  const [overallRating, setOverallRating] = useState(0);
  const [categories, setCategories] = useState<CategoryRatings>({
    serviceRating: 0,
    cleanlinessRating: 0,
    staffRating: 0,
    valueRating: 0,
  });
  const [comment, setComment] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleOverallSelect(rating: number) {
    setOverallRating(rating);
    // Small delay for visual feedback before advancing
    setTimeout(() => setStep("categories"), 350);
  }

  function handleCategoryNext() {
    // Advance even if not all category ratings are filled (they're optional)
    setStep("details");
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createReview({
        appointmentId,
        clientId,
        staffId,
        rating: overallRating,
        comment: comment.trim() || undefined,
        isPublic: true,
        wouldRecommend: wouldRecommend ?? undefined,
        serviceRating: categories.serviceRating || undefined,
        cleanlinessRating: categories.cleanlinessRating || undefined,
        staffRating: categories.staffRating || undefined,
        valueRating: categories.valueRating || undefined,
      });

      if (result.success) {
        setStep("thankyou");
      } else {
        setError(result.error);
      }
    });
  }

  // ─── Step: Overall rating ────────────────────────────────────────────────

  if (step === "overall") {
    return (
      <div className="text-center">
        <StepDots current={0} />
        <div className="mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-rose-100">
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-1">
            How was your visit?
          </h2>
          <p className="text-stone-500 text-sm">
            {staffName
              ? `Rate your experience with ${staffName}`
              : `Rate your experience at ${salonName}`}
          </p>
        </div>

        <div className="flex justify-center mb-2">
          <StarPicker value={overallRating} onChange={handleOverallSelect} size="xl" />
        </div>

        <p className="text-xs text-stone-400 mt-4">Tap a star to continue</p>
      </div>
    );
  }

  // ─── Step: Category ratings ──────────────────────────────────────────────

  if (step === "categories") {
    const allRated = Object.values(categories).every((v) => v > 0);

    return (
      <div>
        <StepDots current={1} />

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-stone-900 mb-1">Rate the details</h2>
          <p className="text-stone-500 text-sm">How did we do in each area?</p>
        </div>

        <div className="bg-stone-50 rounded-2xl px-4 py-1 mb-6">
          <CategoryRow
            label="Service quality"
            icon={
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5-1.5 1.5-5-5v-.79l-.27-.27A6.516 6.516 0 0 1 9.5 16 6.5 6.5 0 0 1 3 9.5 6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14 14 12 14 9.5 12 5 9.5 5z" />
              </svg>
            }
            value={categories.serviceRating}
            onChange={(v) => setCategories((c) => ({ ...c, serviceRating: v }))}
          />
          <CategoryRow
            label="Cleanliness"
            icon={
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
              </svg>
            }
            value={categories.cleanlinessRating}
            onChange={(v) => setCategories((c) => ({ ...c, cleanlinessRating: v }))}
          />
          <CategoryRow
            label="Staff friendliness"
            icon={
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M11.5 2C6.81 2 3 5.81 3 10.5S6.81 19 11.5 19h.5v3c4.86-2.34 8-7 8-11.5C20 5.81 16.19 2 11.5 2zm1 14.5h-2v-2h2v2zm0-4h-2c0-3.25 3-3 3-5 0-1.1-.9-2-2-2s-2 .9-2 2h-2c0-2.21 1.79-4 4-4s4 1.79 4 4c0 2.5-3 2.75-3 5z" />
              </svg>
            }
            value={categories.staffRating}
            onChange={(v) => setCategories((c) => ({ ...c, staffRating: v }))}
          />
          <CategoryRow
            label="Value for money"
            icon={
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
              </svg>
            }
            value={categories.valueRating}
            onChange={(v) => setCategories((c) => ({ ...c, valueRating: v }))}
          />
        </div>

        <button
          type="button"
          onClick={handleCategoryNext}
          className="w-full py-3 rounded-xl bg-rose-500 text-white font-semibold text-sm hover:bg-rose-600 transition-colors"
        >
          {allRated ? "Continue" : "Skip & Continue"}
        </button>

        <button
          type="button"
          onClick={() => setStep("overall")}
          className="w-full mt-2 py-2 text-sm text-stone-400 hover:text-stone-600 transition-colors"
        >
          Back
        </button>
      </div>
    );
  }

  // ─── Step: Details (text + recommend) ────────────────────────────────────

  if (step === "details") {
    return (
      <div>
        <StepDots current={2} />

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-stone-900 mb-1">Tell us more</h2>
          <p className="text-stone-500 text-sm">Your feedback helps us improve</p>
        </div>

        {/* Text area */}
        <div className="mb-5">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What did you love? What could be better?"
            rows={4}
            maxLength={500}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent resize-none transition"
          />
          <p className="text-xs text-stone-300 text-right mt-1">{comment.length}/500</p>
        </div>

        {/* Would you recommend */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-stone-700 mb-3">
            Would you recommend us to a friend?
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setWouldRecommend(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                wouldRecommend === true
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-stone-200 text-stone-500 hover:border-emerald-300 hover:bg-emerald-50/50"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 fill-current"
                aria-hidden="true"
              >
                <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.86-.88-1.22L14 2 7.59 8.41C7.21 8.79 7 9.3 7 9.83V19c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-6.89z" />
              </svg>
              Yes, definitely!
            </button>
            <button
              type="button"
              onClick={() => setWouldRecommend(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                wouldRecommend === false
                  ? "border-stone-500 bg-stone-100 text-stone-700"
                  : "border-stone-200 text-stone-500 hover:border-stone-400"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 fill-current"
                aria-hidden="true"
              >
                <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 6.89c-.1.25-.14.51-.14.79v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 22l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v11h3V3h-3z" />
              </svg>
              Not really
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2 mb-4">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full py-3 rounded-xl bg-rose-500 text-white font-semibold text-sm hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Submitting…" : "Submit Review"}
        </button>

        <button
          type="button"
          onClick={() => setStep("categories")}
          className="w-full mt-2 py-2 text-sm text-stone-400 hover:text-stone-600 transition-colors"
        >
          Back
        </button>
      </div>
    );
  }

  // ─── Step: Thank you ──────────────────────────────────────────────────────

  return (
    <div className="text-center py-6">
      <div className="relative inline-flex mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-100">
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        {/* Confetti-style dots */}
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 opacity-80" />
        <span className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full bg-rose-400 opacity-80" />
      </div>

      <h2 className="text-2xl font-bold text-stone-900 mb-2">Thank you!</h2>
      <p className="text-stone-500 text-sm mb-2">
        Your review has been submitted. We really appreciate your feedback!
      </p>

      {overallRating >= 4 && (
        <p className="text-stone-500 text-sm mb-6">
          We&apos;re so glad you had a great experience at {salonName}.
        </p>
      )}
      {overallRating < 4 && (
        <p className="text-stone-500 text-sm mb-6">
          We&apos;ll use your feedback to make things even better.
        </p>
      )}

      {/* Star summary */}
      <div className="flex justify-center mb-8">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            viewBox="0 0 24 24"
            className={`w-8 h-8 ${
              star <= overallRating
                ? "text-amber-400 fill-amber-400"
                : "text-stone-200 fill-stone-200"
            }`}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>

      <Link
        href={`/book/${salonSlug}`}
        className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-rose-500 text-white font-semibold text-sm hover:bg-rose-600 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        Book Next Appointment
      </Link>
    </div>
  );
}
