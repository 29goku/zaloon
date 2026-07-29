import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { name: true },
  });
  return {
    title: salon ? `Check In — ${salon.name}` : "Kiosk",
  };
}

export default async function KioskLandingPage({ params }: PageProps) {
  const { slug } = await params;

  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true, name: true, logo: true, slug: true },
  });

  if (!salon) notFound();

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-gradient-to-br from-rose-50 via-white to-stone-50 px-8 py-16">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-6 flex-1 justify-center w-full max-w-lg">
        {/* Logo or letter avatar */}
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
          <p className="text-xl text-stone-500 mt-4">
            How can we help you today?
          </p>
        </div>

        {/* ── Action buttons ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 w-full mt-8">
          {/* Primary: Check In */}
          <Link
            href={`/kiosk/${slug}/checkin`}
            className="w-full flex items-center justify-center gap-3 rounded-2xl bg-rose-600 text-white text-2xl font-semibold py-7 px-8 shadow-lg shadow-rose-200 hover:bg-rose-700 active:scale-[0.98] transition-all select-none"
          >
            {/* Calendar check icon */}
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
            I have a booking
          </Link>

          {/* Secondary: Walk In */}
          <Link
            href={`/kiosk/${slug}/walkin`}
            className="w-full flex items-center justify-center gap-3 rounded-2xl bg-stone-100 text-stone-800 text-2xl font-semibold py-7 px-8 border-2 border-stone-200 hover:bg-stone-200 active:scale-[0.98] transition-all select-none"
          >
            {/* Walk icon */}
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
            Walk In
          </Link>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <p className="text-stone-300 text-sm select-none">
        Powered by <span className="font-semibold text-stone-400">Zaloon</span>
      </p>
    </div>
  );
}
