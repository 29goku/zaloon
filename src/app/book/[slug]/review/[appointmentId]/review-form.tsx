"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createReview } from "@/app/actions/reviews";

interface ReviewFormProps {
  appointmentId: string;
  clientId?: string;
  staffId?: string;
  staffName?: string;
  salonName: string;
}

export function ReviewForm({
  appointmentId,
  clientId,
  staffId,
  staffName,
  salonName,
}: ReviewFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayRating = hoveredRating || selectedRating;

  const ratingLabels: Record<number, string> = {
    1: "Poor",
    2: "Fair",
    3: "Good",
    4: "Great",
    5: "Excellent",
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedRating === 0) {
      setError("Please select a rating");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createReview({
        appointmentId,
        clientId: isAnonymous ? undefined : clientId,
        staffId,
        rating: selectedRating,
        comment: comment.trim() || undefined,
        isPublic: !isAnonymous,
      });

      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.error);
      }
    });
  }

  if (submitted) {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-stone-900 mb-2">Thank you!</h2>
        <p className="text-stone-500 text-sm">
          Your review has been submitted. We appreciate your feedback.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Star rating widget */}
      <div>
        <p className="text-sm font-semibold text-stone-700 mb-3">
          How was your experience
          {staffName ? ` with ${staffName}` : ""}?
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
              onClick={() => setSelectedRating(star)}
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
        {error && selectedRating === 0 && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
      </div>

      {/* Comment */}
      <div>
        <label
          htmlFor="comment"
          className="block text-sm font-semibold text-stone-700 mb-2"
        >
          Comments <span className="font-normal text-stone-400">(optional)</span>
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us about your experience..."
          rows={4}
          maxLength={500}
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent resize-none transition"
        />
        <p className="text-xs text-stone-300 text-right mt-1">{comment.length}/500</p>
      </div>

      {/* Anonymous checkbox */}
      <label className="flex items-center gap-3 cursor-pointer group">
        <div className="relative flex-shrink-0">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="sr-only"
          />
          <div
            className={`w-5 h-5 rounded border-2 transition-all ${
              isAnonymous
                ? "bg-rose-500 border-rose-500"
                : "bg-white border-stone-300 group-hover:border-rose-300"
            } flex items-center justify-center`}
          >
            {isAnonymous && (
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
        <span className="text-sm text-stone-600">Submit anonymously</span>
      </label>

      {/* Error message */}
      {error && selectedRating > 0 && (
        <p className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2">{error}</p>
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
