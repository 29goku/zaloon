import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { WaitlistJoinForm } from "./waitlist-join-form";

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

  if (!salon) return { title: "Salon Not Found — Zaloon" };

  return {
    title: `Join Waitlist · ${salon.name} — Zaloon`,
    description: `Add yourself to the waitlist at ${salon.name}. We'll reach out as soon as a slot becomes available.`,
  };
}

export default async function PublicWaitlistPage({ params }: PageProps) {
  const { slug } = await params;

  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      logo: true,
      slug: true,
      city: true,
      country: true,
      Service: {
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!salon) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-stone-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-8 flex flex-col items-center text-center">
          {salon.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={salon.logo}
              alt={salon.name}
              className="w-16 h-16 rounded-2xl object-cover shadow-md mb-4"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white font-bold text-2xl shadow-md shadow-rose-200 mb-4 select-none">
              {salon.name.charAt(0).toUpperCase()}
            </div>
          )}

          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">{salon.name}</h1>

          {(salon.city || salon.country) && (
            <p className="text-sm text-stone-400 mt-1">
              {[salon.city, salon.country].filter(Boolean).join(", ")}
            </p>
          )}

          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-100">
            <svg
              className="w-4 h-4 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <span className="text-sm font-medium text-amber-700">Join the waitlist</span>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-lg mx-auto px-4 py-8 sm:py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 sm:p-8">
          <p className="text-sm text-stone-500 mb-6">
            No appointments available right now? Leave your details and we will reach out as soon as a slot opens up.
          </p>

          <WaitlistJoinForm salonId={salon.id} salonSlug={salon.slug} services={salon.Service} />
        </div>

        <p className="text-center text-xs text-stone-300 mt-6">
          Powered by <span className="font-semibold text-stone-400">Zaloon</span>
        </p>
      </div>
    </div>
  );
}
