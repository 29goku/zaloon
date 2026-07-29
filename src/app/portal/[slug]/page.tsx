"use client";

import { useState } from "react";
import Link from "next/link";
import { use } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

type SalonBranding = {
  name: string;
  city: string | null;
  logo: string | null;
  slug: string;
};

type LookupResult = {
  clientId: string;
  name: string;
  loyaltyPoints: number;
  tier: string;
};

// ─── Phone Search Form ───────────────────────────────────────────────────────

function PhoneSearchForm({ slug }: { slug: string }) {
  const [phone, setPhone] = useState("");
  const [mode, setMode] = useState<"bookings" | "points" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pointsResult, setPointsResult] = useState<LookupResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim() || !mode) return;

    if (mode === "bookings") {
      // Navigate to client history page
      window.location.href = `/portal/${slug}/client/${encodeURIComponent(phone.trim())}`;
      return;
    }

    // Points lookup — show inline result
    setLoading(true);
    setError(null);
    setPointsResult(null);

    try {
      const res = await fetch(`/portal/${slug}/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setPointsResult(data);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-stone-700 mb-1"
          >
            Your phone number
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setError(null);
              setPointsResult(null);
            }}
            placeholder="+1 (555) 000-0000"
            className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-400"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="submit"
            onClick={() => setMode("bookings")}
            className="flex items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 transition-colors shadow-sm shadow-rose-200"
          >
            View my bookings
          </button>
          <button
            type="submit"
            onClick={() => setMode("points")}
            className="flex items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
          >
            Check loyalty points
          </button>
        </div>
      </form>

      {loading && (
        <p className="text-center text-sm text-stone-400">
          Looking up your account…
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {pointsResult && (
        <div className="rounded-xl border border-stone-100 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-stone-900">{pointsResult.name}</p>
              <p className="text-xs text-stone-400 mt-0.5">
                {pointsResult.tier} member
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-rose-500">
                {pointsResult.loyaltyPoints}
              </p>
              <p className="text-xs text-stone-400">points</p>
            </div>
          </div>
          <Link
            href={`/portal/${slug}/client/${encodeURIComponent(phone.trim())}`}
            className="block text-center text-sm text-rose-500 hover:underline"
          >
            View full history
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Server-fetched salon branding ──────────────────────────────────────────

async function getSalonBranding(slug: string): Promise<SalonBranding | null> {
  // Dynamic import keeps prisma out of the client bundle
  const { prisma } = await import("@/lib/prisma");
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { name: true, city: true, logo: true, slug: true },
  });
  return salon;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function PortalLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salon = await getSalonBranding(slug);

  if (!salon) {
    return (
      <div className="flex min-h-96 items-center justify-center p-6">
        <p className="text-stone-400">Salon not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 space-y-10">
      {/* Hero */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-stone-900">
          Welcome to {salon.name}
        </h1>
        {salon.city && (
          <p className="text-stone-400 text-sm">{salon.city}</p>
        )}
      </div>

      {/* Book CTA */}
      <Link
        href={`/book/${slug}`}
        className="flex items-center justify-center gap-2 w-full rounded-xl bg-rose-500 px-6 py-4 text-base font-semibold text-white shadow hover:bg-rose-600 transition-colors shadow-rose-200"
      >
        <svg
          className="w-5 h-5 shrink-0"
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
        Book a new appointment
      </Link>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-stone-100" />
        <span className="text-xs text-stone-400">Already a client?</span>
        <div className="flex-1 border-t border-stone-100" />
      </div>

      {/* Phone lookup */}
      <div className="rounded-xl border border-stone-100 bg-white p-6 shadow-sm">
        <h2 className="mb-1 font-semibold text-stone-900">
          View your bookings &amp; loyalty points
        </h2>
        <p className="text-sm text-stone-400 mb-5">
          Enter your phone number to access your account.
        </p>
        <PhoneSearchForm slug={slug} />
      </div>

      {/* Profile & other links */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/portal/${slug}/profile`}
          className="flex flex-col items-center gap-2 rounded-xl border border-stone-100 bg-white p-4 text-center shadow-sm hover:bg-stone-50 transition-colors"
        >
          <svg
            className="w-6 h-6 text-stone-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          </svg>
          <span className="text-xs font-medium text-stone-600">
            Edit my profile
          </span>
        </Link>

        <Link
          href={`/book/${slug}`}
          className="flex flex-col items-center gap-2 rounded-xl border border-stone-100 bg-white p-4 text-center shadow-sm hover:bg-stone-50 transition-colors"
        >
          <svg
            className="w-6 h-6 text-stone-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-xs font-medium text-stone-600">
            Book an appointment
          </span>
        </Link>
      </div>
    </div>
  );
}
