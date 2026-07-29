"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitReview } from "@/app/actions/portal";

interface PortalReviewFormProps {
  clientId: string;
  salonId: string;
  slug: string;
  staffList: { id: string; name: string }[];
  /** Optional: pre-select an appointment */
  recentAppointments: {
    id: string;
    date: string;
    staffId: string;
    staffName: string;
    services: string;
  }[];
}

const ratingLabels: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Great",
  5: "Excellent",
};

export function PortalReviewForm({
  clientId,
  salonId,
  slug,
  staffList,
  recentAppointments,
}: PortalReviewFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedRating, setSelectedRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(
    recentAppointments[0]?.id ?? ""
  );

  // Auto-populate staff from appointment selection
  function handleAppointmentChange(appointmentId: string) {
    setSelectedAppointmentId(appointmentId);
    const appt = recentAppointments.find((a) => a.id === appointmentId);
    if (appt) setSelectedStaffId(appt.staffId);
  }

  const displayRating = hoveredRating || selectedRating;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedRating === 0) {
      setError("Please select a rating");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await submitReview({
        clientId,
        salonId,
        rating: selectedRating,
        comment: comment.trim() || undefined,
        staffId: selectedStaffId || undefined,
        appointmentId: selectedAppointmentId || undefined,
      });

      if (result.success) {
        setSubmitted(true);
        router.refresh();
      } else {
        setError(result.error ?? "Failed to submit review");
      }
    });
  }

  if (submitted) {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-amber-500"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-stone-900 mb-2">Thank you!</h2>
        <p className="text-stone-500 text-sm mb-6">
          Your review has been submitted. We appreciate your feedback.
        </p>
        <a
          href={`/portal/${slug}/${clientId}`}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 transition-colors"
        >
          Back to my account
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Appointment selector */}
      {recentAppointments.length > 0 && (
        <div>
          <label
            htmlFor="appt-select"
            className="block text-sm font-medium text-stone-700 mb-1.5"
          >
            Which visit are you reviewing?
          </label>
          <select
            id="appt-select"
            value={selectedAppointmentId}
            onChange={(e) => handleAppointmentChange(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
          >
            <option value="">General feedback</option>
            {recentAppointments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.date} — {a.services} with {a.staffName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Star rating */}
      <div>
        <p className="text-sm font-semibold text-stone-700 mb-3">
          How was your experience?
        </p>
        <div
          className="flex gap-2"
          role="radiogroup"
          aria-label="Rating"
          onMouseLeave={() => setHoveredRating(0)}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={selectedRating === star}
              aria-label={`${star} star${star !== 1 ? "s" : ""}`}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded"
              onMouseEnter={() => setHoveredRating(star)}
              onClick={() => {
                setSelectedRating(star);
                if (error === "Please select a rating") setError(null);
              }}
            >
              <svg
                viewBox="0 0 24 24"
                className={`w-10 h-10 transition-all duration-100 ${
                  star <= displayRating
                    ? "text-amber-400 fill-amber-400 scale-110"
                    : "text-stone-200 fill-stone-200"
                }`}
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          ))}
        </div>
        {displayRating > 0 && (
          <p className="text-sm font-medium text-amber-600 mt-2">
            {ratingLabels[displayRating]}
          </p>
        )}
        {error === "Please select a rating" && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
      </div>

      {/* Staff selector */}
      {staffList.length > 0 && (
        <div>
          <label
            htmlFor="review-staff"
            className="block text-sm font-medium text-stone-700 mb-1.5"
          >
            Who served you?{" "}
            <span className="text-stone-400 font-normal">(optional)</span>
          </label>
          <select
            id="review-staff"
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
          >
            <option value="">Select a stylist…</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Comment */}
      <div>
        <label
          htmlFor="review-comment"
          className="block text-sm font-medium text-stone-700 mb-1.5"
        >
          Comments{" "}
          <span className="text-stone-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us about your experience…"
          rows={4}
          maxLength={500}
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent resize-none transition"
        />
        <p className="text-xs text-stone-300 text-right mt-1">
          {comment.length}/500
        </p>
      </div>

      {/* Error */}
      {error && error !== "Please select a rating" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending || selectedRating === 0}
        className="w-full py-3 rounded-xl bg-rose-500 text-white font-semibold text-sm hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? "Submitting…" : "Submit Review"}
      </button>
    </form>
  );
}
