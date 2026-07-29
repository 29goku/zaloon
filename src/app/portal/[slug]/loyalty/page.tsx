"use client";

// Public loyalty status page for clients — no auth required.
// Client component: phone lookup is done client-side via the existing
// /portal/[slug]/lookup POST endpoint.

import { useState } from "react";
import { use } from "react";
import { getClientTier, getPointsToNextTier, LOYALTY_TIERS } from "@/lib/loyalty-tiers";

// ─── Types ────────────────────────────────────────────────────────────────────

type LoyaltyEntry = {
  id: string;
  type: string;
  amount: number;
  note: string | null;
  createdAt: string;
};

type LoyaltyData = {
  name: string;
  loyaltyPoints: number;
  ledgerEntries: LoyaltyEntry[];
};

// ─── Tier colour helpers ──────────────────────────────────────────────────────

const TIER_COLORS: Record<
  string,
  { bg: string; text: string; bar: string; border: string; dot: string }
> = {
  Bronze: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    bar: "bg-amber-500",
    border: "border-amber-200",
    dot: "#d97706",
  },
  Silver: {
    bg: "bg-slate-50",
    text: "text-slate-600",
    bar: "bg-slate-400",
    border: "border-slate-200",
    dot: "#94a3b8",
  },
  Gold: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    bar: "bg-yellow-500",
    border: "border-yellow-200",
    dot: "#eab308",
  },
  Platinum: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    bar: "bg-purple-500",
    border: "border-purple-200",
    dot: "#a855f7",
  },
};

// ─── Progress bar to next tier ───────────────────────────────────────────────

function ProgressBar({
  currentPoints,
  barColor,
}: {
  currentPoints: number;
  barColor: string;
}) {
  const currentTier = getClientTier(currentPoints);
  const toNext = getPointsToNextTier(currentPoints);

  if (toNext === null) {
    return (
      <div className="space-y-1">
        <div className="h-2 rounded-full bg-purple-100 overflow-hidden">
          <div className={`h-full w-full rounded-full ${barColor}`} />
        </div>
        <p className="text-xs text-stone-400">Maximum tier reached — Platinum</p>
      </div>
    );
  }

  // Find the next tier
  const sortedTiers = [...LOYALTY_TIERS].sort(
    (a, b) => a.minPoints - b.minPoints
  );
  const nextTier = sortedTiers.find((t) => t.minPoints > currentTier.minPoints);
  const tierMin = currentTier.minPoints;
  const tierMax = nextTier?.minPoints ?? currentPoints + toNext;
  const span = tierMax - tierMin;
  const progress = span > 0 ? Math.min(((currentPoints - tierMin) / span) * 100, 100) : 0;

  return (
    <div className="space-y-1">
      <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${progress.toFixed(1)}%` }}
        />
      </div>
      <p className="text-xs text-stone-400">
        {toNext.toLocaleString()} more points to{" "}
        <span className="font-medium">{nextTier?.name}</span>
      </p>
    </div>
  );
}

// ─── Loyalty results card ─────────────────────────────────────────────────────

function LoyaltyCard({ data }: { data: LoyaltyData }) {
  const tier = getClientTier(data.loyaltyPoints);
  const colors = TIER_COLORS[tier.name] ?? TIER_COLORS.Bronze;

  return (
    <div className="space-y-6">
      {/* ── Points card ── */}
      <div
        className={`rounded-2xl border-2 p-6 space-y-4 ${colors.bg} ${colors.border}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-stone-500 font-medium">{data.name}</p>
            <p className={`text-4xl font-bold mt-1 ${colors.text}`}>
              {data.loyaltyPoints.toLocaleString()}
              <span className="text-base font-normal text-stone-400 ml-1">
                points
              </span>
            </p>
          </div>
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${colors.bg} ${colors.text} ${colors.border} border-2`}
          >
            {tier.name}
          </span>
        </div>

        <ProgressBar
          currentPoints={data.loyaltyPoints}
          barColor={colors.bar}
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white/60 px-3 py-2">
            <p className="text-xs text-stone-500 font-medium">Automatic discount</p>
            <p className={`text-sm font-bold mt-0.5 ${colors.text}`}>
              {tier.discountPct > 0
                ? `${tier.discountPct}% off`
                : "None yet"}
            </p>
          </div>
          <div className="rounded-lg bg-white/60 px-3 py-2">
            <p className="text-xs text-stone-500 font-medium">Points multiplier</p>
            <p className={`text-sm font-bold mt-0.5 ${colors.text}`}>
              {tier.pointMultiplier}x per visit
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-stone-600 mb-1">
            {tier.name} benefits
          </p>
          <ul className="space-y-0.5">
            {tier.benefits.map((b) => (
              <li key={b} className="text-xs text-stone-500 flex items-center gap-1.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: colors.dot }}
                />
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Redemption history ── */}
      {data.ledgerEntries.length > 0 && (
        <div className="rounded-xl border border-stone-100 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-stone-900 text-sm mb-3">
            Recent points activity
          </h3>
          <div className="space-y-2.5">
            {data.ledgerEntries.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs text-stone-600 truncate">
                    {entry.note ??
                      (entry.amount >= 0
                        ? "Points earned"
                        : "Points redeemed")}
                  </p>
                  <p className="text-xs text-stone-400">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`text-sm font-bold shrink-0 ${
                    entry.amount >= 0
                      ? "text-emerald-600"
                      : "text-red-500"
                  }`}
                >
                  {entry.amount >= 0 ? "+" : ""}
                  {entry.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── How to earn section ── */}
      <div className="rounded-xl border border-stone-100 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-stone-900 text-sm mb-4">
          How to earn &amp; redeem points
        </h3>
        <div className="space-y-4">
          {LOYALTY_TIERS.map((t) => {
            const tc = TIER_COLORS[t.name] ?? TIER_COLORS.Bronze;
            return (
              <div key={t.name} className="flex items-start gap-3">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                  style={{ background: tc.dot }}
                />
                <div>
                  <p className="text-xs font-semibold text-stone-700">
                    {t.name}{" "}
                    <span className="font-normal text-stone-400">
                      ({t.minPoints.toLocaleString()}+ pts)
                    </span>
                  </p>
                  <ul className="mt-0.5 space-y-0.5">
                    {t.benefits.map((b) => (
                      <li key={b} className="text-xs text-stone-500">
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-stone-400 border-t border-stone-100 pt-3">
          Points are worth $0.01 each when redeemed. Ask your stylist to apply
          points at checkout.
        </p>
      </div>
    </div>
  );
}

// ─── Phone lookup form ────────────────────────────────────────────────────────

function PhoneLookupForm({ slug }: { slug: string }) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LoyaltyData | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = phone.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`/portal/${slug}/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: trimmed }),
      });

      type LookupResponse = {
        error?: string;
        name?: string;
        loyaltyPoints?: number;
        ledgerEntries?: LoyaltyEntry[];
      };

      const json = (await res.json()) as LookupResponse;

      if (!res.ok || json.error) {
        setError(json.error ?? "Something went wrong. Please try again.");
        return;
      }

      setData({
        name: json.name ?? "",
        loyaltyPoints: json.loyaltyPoints ?? 0,
        ledgerEntries: json.ledgerEntries ?? [],
      });
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
            htmlFor="loyalty-phone"
            className="block text-sm font-medium text-stone-700 mb-1"
          >
            Your phone number
          </label>
          <input
            id="loyalty-phone"
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setError(null);
              if (data) setData(null);
            }}
            placeholder="+1 (555) 000-0000"
            className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-400"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60 transition-colors shadow-sm shadow-rose-200"
        >
          {loading ? "Looking up…" : "Check my loyalty status"}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {data && <LoyaltyCard data={data} />}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoyaltyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  return (
    <div
      data-theme="light"
      className="mx-auto max-w-lg px-4 py-10 space-y-8"
    >
      {/* Hero */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-rose-50 mb-3">
          <svg
            className="w-7 h-7 text-rose-500"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-stone-900">Loyalty Rewards</h1>
        <p className="text-sm text-stone-500">
          Enter your phone number to check your points balance and tier status.
        </p>
      </div>

      {/* Lookup card */}
      <div className="rounded-xl border border-stone-100 bg-white p-6 shadow-sm">
        <PhoneLookupForm slug={slug} />
      </div>
    </div>
  );
}
