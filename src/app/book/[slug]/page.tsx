import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { BookingWizard } from "./booking-wizard";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { name: true, city: true, logo: true },
  });

  if (!salon) {
    return {
      title: "Salon Not Found — Zaloon",
    };
  }

  const title = `Book at ${salon.name}${salon.city ? ` · ${salon.city}` : ""}`;
  const description = `Book your appointment at ${salon.name}${salon.city ? ` in ${salon.city}` : ""}. Choose your service, pick a time that works for you, and confirm in seconds.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Zaloon",
      ...(salon.logo ? { images: [{ url: salon.logo, width: 512, height: 512 }] } : {}),
    },
    twitter: {
      card: "summary",
      title,
      description,
      ...(salon.logo ? { images: [salon.logo] } : {}),
    },
  };
}

export default async function BookingPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { embed } = await searchParams;
  const isEmbed = embed === "1";

  // ── Reviews summary (trust bar) ────────────────────────────────────────────
  const salonForReviews = await prisma.salon.findUnique({ where: { slug }, select: { id: true } });
  const reviewSummary = salonForReviews
    ? await prisma.review.aggregate({
        where: { salonId: salonForReviews.id, isPublic: true },
        _avg: { rating: true },
        _count: { id: true },
      })
    : null;
  const avgRating = reviewSummary?._avg?.rating ?? 0;
  const reviewCount = reviewSummary?._count?.id ?? 0;

  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      logo: true,
      slug: true,
      city: true,
      country: true,
      phone: true,
      currency: true,
      ServiceCategory: {
        select: {
          id: true,
          name: true,
          icon: true,
          Service: {
            where: { active: true },
            select: {
              id: true,
              name: true,
              price: true,
              durationMins: true,
              StaffService: {
                select: {
                  Staff: {
                    select: {
                      id: true,
                      name: true,
                      avatar: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!salon) {
    notFound();
  }

  // Flatten into wizard-friendly shape, filtering out empty categories
  const categories = salon.ServiceCategory.filter((cat) => cat.Service.length > 0).map(
    (cat) => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      services: cat.Service.map((svc) => ({
        id: svc.id,
        name: svc.name,
        price: svc.price,
        durationMins: svc.durationMins,
        staff: svc.StaffService.map((ss) => ss.Staff),
      })),
    })
  );

  const wizardProps = {
    salon: {
      id: salon.id,
      name: salon.name,
      logo: salon.logo,
      slug: salon.slug,
      city: salon.city,
      currency: salon.currency,
    },
    categories,
  };

  // ─── Embed mode: minimal white frame, no branding header ─────────────────
  if (isEmbed) {
    return (
      <div className="bg-white p-4 sm:p-6">
        <BookingWizard {...wizardProps} />
      </div>
    );
  }

  // ─── Full page mode ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-stone-50">
      {/* ─── Public salon landing header ─────────────────────────────────────── */}
      <header className="bg-white border-b border-stone-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-8 flex flex-col items-center text-center">
          {/* Logo or letter avatar */}
          {salon.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={salon.logo}
              alt={salon.name}
              className="w-20 h-20 rounded-2xl object-cover shadow-md mb-4"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white font-bold text-3xl shadow-md shadow-rose-200 mb-4 select-none">
              {salon.name.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Salon name */}
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">{salon.name}</h1>

          {/* Location */}
          {(salon.city || salon.country) && (
            <p className="flex items-center gap-1.5 text-sm text-stone-400 mt-1.5">
              <svg
                className="w-4 h-4 shrink-0"
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
            <a
              href={`tel:${salon.phone}`}
              className="flex items-center gap-1.5 text-sm text-rose-500 hover:text-rose-600 mt-1 transition-colors"
            >
              <svg
                className="w-4 h-4 shrink-0"
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
            </a>
          )}

          {/* Hero CTA */}
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 border border-rose-100">
            <svg
              className="w-4 h-4 text-rose-500"
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
            <span className="text-sm font-medium text-rose-600">Book your appointment online</span>
          </div>
        </div>
      </header>

      {/* ─── Trust bar ───────────────────────────────────────────────────────── */}
      {reviewCount > 0 && (
        <div className="border-b border-stone-100 bg-amber-50/60">
          <div className="max-w-lg mx-auto px-4 py-2.5 flex items-center justify-center gap-4 flex-wrap text-sm">
            {/* Stars */}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-4 h-4 ${star <= Math.round(avgRating) ? "text-amber-400" : "text-gray-200"}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="ml-1 font-semibold text-gray-800">{avgRating.toFixed(1)}</span>
            </div>
            {/* Happy clients */}
            <span className="text-gray-500">
              <span className="font-semibold text-gray-700">{reviewCount}</span>{" "}
              happy client{reviewCount !== 1 ? "s" : ""}
            </span>
            {/* Reviews link */}
            <a
              href={`/${slug}#reviews-section`}
              className="text-amber-600 hover:text-amber-700 underline underline-offset-2 transition-colors"
            >
              {reviewCount} review{reviewCount !== 1 ? "s" : ""}
            </a>
          </div>
        </div>
      )}

      {/* ─── Booking wizard ───────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 py-8 sm:py-10">
        <div className="bg-white rounded-2xl shadow-lg border border-stone-100 p-6 sm:p-8">
          <BookingWizard {...wizardProps} />
        </div>

        <p className="text-center text-xs text-stone-300 mt-6">
          Powered by <span className="font-semibold text-stone-400">Zaloon</span>
        </p>
      </div>
    </div>
  );
}
