import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PurchaseForm } from "./purchase-form";

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

  if (!salon) return { title: "Gift Cards — Zaloon" };

  return {
    title: `Gift Cards · ${salon.name}`,
    description: `Purchase a gift card for ${salon.name} and surprise your loved ones with the gift of self-care.`,
  };
}

export default async function GiftCardPurchasePage({ params }: PageProps) {
  const { slug } = await params;

  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true, name: true, logo: true, slug: true, city: true, country: true },
  });

  if (!salon) notFound();

  const salonUrl =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/book/${slug}`
      : `/book/${slug}`;

  return (
    <div data-theme="light" className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-stone-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-6 flex flex-col items-center text-center">
          {/* Logo or letter avatar */}
          {salon.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={salon.logo}
              alt={salon.name}
              className="w-16 h-16 rounded-2xl object-cover shadow-md mb-3"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-2xl shadow-md shadow-amber-200 mb-3 select-none">
              {salon.name.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Gift icon + heading */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🎁</span>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
              Gift a Salon Experience
            </h1>
          </div>

          <p className="text-stone-600 font-medium">{salon.name}</p>
          {(salon.city || salon.country) && (
            <p className="text-xs text-stone-400 mt-0.5">
              {[salon.city, salon.country].filter(Boolean).join(", ")}
            </p>
          )}

          <p className="mt-3 text-sm text-stone-500 max-w-xs">
            Surprise your loved ones with the gift of self-care
          </p>

          {/* Back to booking link */}
          <a
            href={`/book/${slug}`}
            className="mt-4 text-xs text-stone-400 hover:text-stone-600 underline underline-offset-2 transition-colors"
          >
            ← Back to booking
          </a>
        </div>
      </header>

      {/* ─── Purchase form ──────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 py-8 sm:py-10">
        <div className="bg-white rounded-2xl shadow-lg border border-stone-100 p-6 sm:p-8">
          <PurchaseForm
            salonSlug={slug}
            salonName={salon.name}
            salonUrl={salonUrl}
          />
        </div>

        {/* Check balance link */}
        <div className="mt-4 text-center">
          <a
            href={`/book/${slug}/gift-card/check`}
            className="text-sm text-amber-700 hover:text-amber-800 underline underline-offset-2 transition-colors"
          >
            Already have a gift card? Check your balance →
          </a>
        </div>

        <p className="text-center text-xs text-stone-300 mt-6">
          Powered by <span className="font-semibold text-stone-400">Zaloon</span>
        </p>
      </div>
    </div>
  );
}
