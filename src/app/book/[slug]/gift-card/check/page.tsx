import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { BalanceChecker } from "./balance-checker";

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

  if (!salon) return { title: "Check Gift Card Balance — Zaloon" };

  return {
    title: `Check Balance · ${salon.name}`,
    description: `Check your gift card balance at ${salon.name}.`,
  };
}

export default async function GiftCardCheckPage({ params }: PageProps) {
  const { slug } = await params;

  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true, name: true, logo: true, slug: true },
  });

  if (!salon) notFound();

  return (
    <div data-theme="light" className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-stone-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-6 flex flex-col items-center text-center">
          {salon.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={salon.logo}
              alt={salon.name}
              className="w-14 h-14 rounded-2xl object-cover shadow-md mb-3"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-amber-200 mb-3 select-none">
              {salon.name.charAt(0).toUpperCase()}
            </div>
          )}

          <h1 className="text-xl font-bold text-stone-900 tracking-tight">Check Gift Card Balance</h1>
          <p className="text-stone-500 text-sm mt-1">{salon.name}</p>

          <div className="mt-3 flex gap-3 text-xs">
            <a
              href={`/book/${slug}/gift-card`}
              className="text-amber-700 hover:text-amber-800 underline underline-offset-2 transition-colors"
            >
              Purchase a gift card
            </a>
            <span className="text-stone-300">·</span>
            <a
              href={`/book/${slug}`}
              className="text-stone-400 hover:text-stone-600 underline underline-offset-2 transition-colors"
            >
              Back to booking
            </a>
          </div>
        </div>
      </header>

      {/* ─── Balance checker ─────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 py-8 sm:py-10">
        <div className="bg-white rounded-2xl shadow-lg border border-stone-100 p-6 sm:p-8">
          <BalanceChecker />
        </div>

        <p className="text-center text-xs text-stone-300 mt-6">
          Powered by <span className="font-semibold text-stone-400">Zaloon</span>
        </p>
      </div>
    </div>
  );
}
