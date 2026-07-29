import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book an Appointment — Zaloon",
  description: "Browse salons and book your appointment online in seconds.",
};

export default async function BookDirectoryPage() {
  const salons = await prisma.salon.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      city: true,
      country: true,
      phone: true,
    },
    orderBy: { name: "asc" },
  });

  // Auto-redirect when only one salon exists
  if (salons.length === 1) {
    redirect(`/book/${salons[0].slug}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-stone-50">
      {/* ─── Page header ──────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-stone-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 shadow-md shadow-rose-200 mb-4">
            <svg
              className="w-7 h-7 text-white"
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
          </div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Book an Appointment</h1>
          <p className="text-stone-500">
            Choose a salon below and book your appointment online in seconds.
          </p>
        </div>
      </header>

      {/* ─── Salon cards ──────────────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-4 py-10">
        {salons.length === 0 ? (
          <div className="text-center py-20 text-stone-400">
            <p className="text-lg font-medium">No salons available yet.</p>
            <p className="text-sm mt-1">Check back soon!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {salons.map((salon) => (
              <div
                key={salon.id}
                className="bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    {/* Logo or letter avatar */}
                    {salon.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={salon.logo}
                        alt={salon.name}
                        className="w-14 h-14 rounded-xl object-cover shadow-sm shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white font-bold text-xl shadow-sm shadow-rose-100 shrink-0 select-none">
                        {salon.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <h2 className="font-bold text-stone-900 text-lg leading-tight truncate">
                        {salon.name}
                      </h2>

                      {/* Location */}
                      {(salon.city || salon.country) && (
                        <p className="flex items-center gap-1 text-xs text-stone-400 mt-1">
                          <svg
                            className="w-3 h-3 shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          {[salon.city, salon.country].filter(Boolean).join(", ")}
                        </p>
                      )}

                      {/* Phone */}
                      {salon.phone && (
                        <p className="flex items-center gap-1 text-xs text-stone-400 mt-0.5">
                          <svg
                            className="w-3 h-3 shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                          {salon.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/book/${salon.slug}`}
                    className="block w-full text-center h-11 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition-colors shadow-sm shadow-rose-200 flex items-center justify-center gap-2"
                  >
                    Book Now
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-stone-300 mt-10">
          Powered by <span className="font-semibold text-stone-400">Zaloon</span>
        </p>
      </main>
    </div>
  );
}
