"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Props {
  salon: { id: string; name: string; logo: string | null; slug: string };
  waitingCount: number;
}

function LiveClock() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;

  return (
    <p className="text-6xl font-bold tabular-nums text-stone-800 tracking-tight select-none">
      {time}
    </p>
  );
}

export function KioskWelcomeClient({ salon, waitingCount }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-gradient-to-br from-rose-50 via-white to-stone-50 px-8 py-14">
      {/* ── Clock ── */}
      <div className="w-full flex justify-center pt-2">
        <LiveClock />
      </div>

      {/* ── Center content ── */}
      <div className="flex flex-col items-center gap-6 w-full max-w-lg">
        {/* Logo / letter avatar */}
        {salon.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={salon.logo}
            alt={salon.name}
            className="w-32 h-32 rounded-3xl object-cover shadow-xl"
          />
        ) : (
          <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white font-bold text-5xl shadow-xl shadow-rose-200 select-none">
            {salon.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="text-center">
          <h1 className="text-5xl font-bold text-stone-900 tracking-tight leading-tight">
            Welcome to
          </h1>
          <h2 className="text-5xl font-bold text-rose-600 tracking-tight leading-tight mt-1">
            {salon.name}
          </h2>
          <p className="text-xl text-stone-500 mt-4">How can we help you today?</p>
        </div>

        {/* Waitlist badge */}
        {waitingCount > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-5 py-2.5 text-amber-700 font-semibold text-lg select-none">
            <svg
              className="w-5 h-5 text-amber-500 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5m-2-6.5V20M9.5 9.5l-2.5 4 3 1m5-5.5l2.5 4-3 1"
              />
              <circle cx="12" cy="4.5" r="1.5" fill="currentColor" />
            </svg>
            Waiting: {waitingCount} {waitingCount === 1 ? "person" : "people"}
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="flex flex-col gap-4 w-full mt-4">
          <Link
            href={`/kiosk/${salon.slug}/check-in`}
            className="w-full flex items-center justify-center gap-3 rounded-2xl bg-rose-600 text-white text-2xl font-semibold py-7 px-8 shadow-lg shadow-rose-200 hover:bg-rose-700 active:scale-[0.98] transition-all select-none"
          >
            <svg
              className="w-8 h-8 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            I have an appointment
          </Link>

          <Link
            href={`/kiosk/${salon.slug}/walk-in`}
            className="w-full flex items-center justify-center gap-3 rounded-2xl bg-stone-100 text-stone-800 text-2xl font-semibold py-7 px-8 border-2 border-stone-200 hover:bg-stone-200 active:scale-[0.98] transition-all select-none"
          >
            <svg
              className="w-8 h-8 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5m-2-6.5V20M9.5 9.5l-2.5 4 3 1m5-5.5l2.5 4-3 1"
              />
              <circle cx="12" cy="4.5" r="1.5" fill="currentColor" />
            </svg>
            Walk in / No appointment
          </Link>
        </div>
      </div>

      {/* ── Footer ── */}
      <p className="text-stone-300 text-sm select-none">
        Powered by <span className="font-semibold text-stone-400">Zaloon</span>
      </p>
    </div>
  );
}
