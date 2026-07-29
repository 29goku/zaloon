import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// ─── SEO metadata ─────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const salon = await prisma.salon.findFirst({ where: { slug }, select: { name: true, logo: true } });
  const description = `Book appointments at ${salon?.name ?? "this salon"}. Expert beauty services available online.`;
  return {
    title: salon?.name ?? "Salon",
    description,
    openGraph: {
      title: salon?.name ?? "Salon",
      description,
      type: "website",
      siteName: "Zaloon",
      ...(salon?.logo ? { images: [{ url: salon.logo, width: 512, height: 512 }] } : {}),
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StarRating({
  rating,
  size = "md",
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "lg" ? "w-7 h-7" : size === "sm" ? "w-4 h-4" : "w-5 h-5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${sizeClass} ${star <= Math.round(rating) ? "text-amber-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function InitialsAvatar({ name, colorIndex }: { name: string; colorIndex: number }) {
  const colors = [
    "bg-amber-400 text-amber-900",
    "bg-rose-400 text-rose-900",
    "bg-emerald-400 text-emerald-900",
    "bg-violet-400 text-violet-900",
    "bg-sky-400 text-sky-900",
    "bg-orange-400 text-orange-900",
  ];
  const color = colors[colorIndex % colors.length];
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div
      className={`w-16 h-16 rounded-full ${color} flex items-center justify-center text-xl font-bold select-none`}
    >
      {initials}
    </div>
  );
}

function parseBusinessHours(raw: string | null | undefined): { day: string; hours: string }[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    if (Array.isArray(parsed)) {
      return parsed.map((entry: { day?: number; open?: string; close?: string; closed?: boolean }) => ({
        day: typeof entry.day === "number" ? dayNames[entry.day] ?? String(entry.day) : String(entry.day ?? ""),
        hours: entry.closed ? "Closed" : `${entry.open ?? ""} – ${entry.close ?? ""}`,
      }));
    }
    // Object form { mon: { open, close }, ... }
    return Object.entries(parsed).map(([day, val]: [string, unknown]) => {
      const v = val as { open?: string; close?: string; closed?: boolean } | null;
      return {
        day: day.charAt(0).toUpperCase() + day.slice(0, 3).toLowerCase(),
        hours: !v || (v as { closed?: boolean }).closed ? "Closed" : `${v.open ?? ""} – ${v.close ?? ""}`,
      };
    });
  } catch {
    return [];
  }
}

// ─── Gallery gradient palettes ────────────────────────────────────────────────
const GALLERY_ITEMS = [
  { label: "Hair Styling", gradient: "from-amber-200 to-orange-300" },
  { label: "Color & Highlights", gradient: "from-rose-200 to-pink-300" },
  { label: "Nail Art", gradient: "from-violet-200 to-purple-300" },
  { label: "Facial", gradient: "from-emerald-200 to-teal-300" },
  { label: "Massage", gradient: "from-sky-200 to-blue-300" },
  { label: "Makeup", gradient: "from-fuchsia-200 to-pink-300" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function SalonPage({ params }: PageProps) {
  const { slug } = await params;

  const salon = await prisma.salon.findFirst({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      address: true,
      city: true,
      country: true,
      phone: true,
      email: true,
      businessHours: true,
      ServiceCategory: {
        select: {
          id: true,
          name: true,
          icon: true,
          Service: {
            where: { active: true },
            select: { id: true, name: true, price: true, durationMins: true },
          },
        },
      },
      Staff: {
        select: { id: true, name: true, avatar: true },
      },
      Review: {
        where: { isPublic: true },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          Client: { select: { name: true } },
        },
      },
    },
  });

  if (!salon) {
    notFound();
  }

  // ── Derived data ────────────────────────────────────────────────────────────
  const allReviews = salon.Review;
  const avgRating =
    allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0;

  const allServices = salon.ServiceCategory.flatMap((c) => c.Service);
  const featuredServices = allServices.slice(0, 6);

  const businessHours = parseBusinessHours(salon.businessHours);

  const locationParts = [salon.address, salon.city, salon.country].filter(Boolean);
  const locationStr = locationParts.join(", ");

  const bookHref = `/book/${slug}`;

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* ═══════════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════════════ */}
      <section className="relative w-full bg-gradient-to-br from-amber-50 via-orange-50 to-orange-100 overflow-hidden">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-80 h-80 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -left-10 w-60 h-60 rounded-full bg-orange-200/30 blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-6 py-20 flex flex-col items-center text-center gap-6">
          {/* Logo */}
          {salon.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={salon.logo}
              alt={salon.name}
              className="w-24 h-24 rounded-2xl object-cover shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-4xl shadow-lg shadow-amber-200 select-none">
              {salon.name.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Name */}
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight">
            {salon.name}
          </h1>

          {/* Tagline */}
          <p className="text-lg sm:text-xl text-gray-600 max-w-xl leading-relaxed">
            Expert beauty services, tailored just for you.
          </p>

          {/* Rating row */}
          {allReviews.length > 0 && (
            <div className="flex items-center gap-3 bg-white/70 backdrop-blur-sm rounded-full px-5 py-2.5 shadow-sm border border-amber-100">
              <StarRating rating={avgRating} size="sm" />
              <span className="text-sm font-semibold text-gray-800">
                {avgRating.toFixed(1)}
              </span>
              <span className="text-sm text-gray-500">
                ({allReviews.length} review{allReviews.length !== 1 ? "s" : ""})
              </span>
            </div>
          )}

          {/* Address */}
          {locationStr && (
            <p className="flex items-center gap-1.5 text-sm text-gray-500">
              <svg className="w-4 h-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {locationStr}
            </p>
          )}

          {/* CTA */}
          <Link
            href={bookHref}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg shadow-lg shadow-amber-200 transition-all duration-200 hover:scale-105 active:scale-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Book Now
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SERVICES
      ══════════════════════════════════════════════════════════════════════════ */}
      {salon.ServiceCategory.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Our Services</h2>
            <p className="text-gray-500 mt-2">Everything you need, all in one place</p>
          </div>

          {/* Category cards */}
          {salon.ServiceCategory.filter((c) => c.Service.length > 0).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-12">
              {salon.ServiceCategory.filter((c) => c.Service.length > 0).map((cat) => {
                const prices = cat.Service.map((s) => s.price);
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const priceRange =
                  minPrice === maxPrice
                    ? `$${minPrice}`
                    : `$${minPrice}–$${maxPrice}`;
                return (
                  <div
                    key={cat.id}
                    className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-amber-50 border border-amber-100 text-center hover:shadow-md transition-shadow"
                  >
                    <div className="w-12 h-12 rounded-xl bg-amber-200 flex items-center justify-center text-2xl">
                      {cat.icon ?? "✂️"}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{cat.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {cat.Service.length} service{cat.Service.length !== 1 ? "s" : ""}
                      </p>
                      <p className="text-xs font-medium text-amber-600 mt-1">{priceRange}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Featured service cards */}
          {featuredServices.length > 0 && (
            <>
              <h3 className="text-xl font-semibold text-gray-800 mb-5">Featured Services</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {featuredServices.map((svc) => (
                  <div
                    key={svc.id}
                    className="flex flex-col justify-between gap-4 p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow bg-white"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 text-base">{svc.name}</p>
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {svc.durationMins} min
                        </span>
                        <span className="font-semibold text-gray-800">${svc.price}</span>
                      </div>
                    </div>
                    <Link
                      href={bookHref}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium text-sm transition-colors"
                    >
                      Book this
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TEAM
      ══════════════════════════════════════════════════════════════════════════ */}
      {salon.Staff.length > 0 && (
        <section className="bg-gray-50 py-16">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900">Meet the Team</h2>
              <p className="text-gray-500 mt-2">Passionate professionals dedicated to your beauty</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {salon.Staff.map((member, idx) => (
                <div
                  key={member.id}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-center"
                >
                  {member.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <InitialsAvatar name={member.name} colorIndex={idx} />
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Hair Stylist</p>
                    <p className="text-xs text-amber-600 mt-0.5 font-medium">5+ years exp.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          REVIEWS
      ══════════════════════════════════════════════════════════════════════════ */}
      {allReviews.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">What Our Clients Say</h2>
            <div className="flex flex-col items-center gap-2 mt-4">
              <div className="flex items-center gap-3">
                <span className="text-5xl font-extrabold text-gray-900">{avgRating.toFixed(1)}</span>
                <StarRating rating={avgRating} size="lg" />
              </div>
              <p className="text-sm text-gray-500">
                Based on {allReviews.length} review{allReviews.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {allReviews.map((review) => {
              const firstName = review.Client?.name?.split(" ")[0] ?? "Guest";
              const dateStr = new Date(review.createdAt).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              });
              return (
                <div
                  key={review.id}
                  className="flex flex-col gap-3 p-5 rounded-2xl border border-gray-100 shadow-sm bg-white hover:shadow-md transition-shadow"
                >
                  <StarRating rating={review.rating} size="sm" />
                  {review.comment && (
                    <p className="text-gray-700 text-sm leading-relaxed line-clamp-4">
                      &ldquo;{review.comment}&rdquo;
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
                    <span className="text-sm font-semibold text-gray-800">{firstName}</span>
                    <span className="text-xs text-gray-400">{dateStr}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          GALLERY (placeholder)
      ══════════════════════════════════════════════════════════════════════════ */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Our Work</h2>
            <p className="text-gray-500 mt-2">A glimpse of the transformations we create</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {GALLERY_ITEMS.map((item) => (
              <div
                key={item.label}
                className={`relative aspect-square rounded-2xl bg-gradient-to-br ${item.gradient} flex items-end overflow-hidden shadow-sm`}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-12 h-12 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="relative w-full px-4 py-3 bg-gradient-to-t from-black/30 to-transparent">
                  <p className="text-white font-medium text-sm">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          BOOK CTA
      ══════════════════════════════════════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 text-white text-center px-8 py-14 shadow-xl shadow-amber-200 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-extrabold">Ready to look your best?</h2>
            <p className="mt-3 text-amber-100 text-lg max-w-md mx-auto">
              Book your appointment online in seconds — no calls, no waiting.
            </p>
            <Link
              href={bookHref}
              className="mt-8 inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-amber-600 font-bold text-lg hover:bg-amber-50 transition-all duration-200 hover:scale-105 active:scale-100 shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Book Your Appointment
            </Link>

            {/* Business hours */}
            {businessHours.length > 0 && (
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                {businessHours.map((h) => (
                  <div key={h.day} className="flex flex-col items-center bg-white/20 rounded-xl px-3 py-2 min-w-[64px]">
                    <span className="text-xs font-bold text-white/80 uppercase tracking-wide">{h.day}</span>
                    <span className="text-xs text-white mt-0.5">{h.hours}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-8">
          {/* Salon info */}
          <div className="flex flex-col items-center sm:items-start gap-1 text-sm">
            <p className="text-lg font-bold text-gray-900">{salon.name}</p>
            {locationStr && <p className="text-gray-500">{locationStr}</p>}
            {salon.phone && (
              <a href={`tel:${salon.phone}`} className="text-amber-600 hover:text-amber-700 transition-colors">
                {salon.phone}
              </a>
            )}
            {salon.email && (
              <a href={`mailto:${salon.email}`} className="text-amber-600 hover:text-amber-700 transition-colors">
                {salon.email}
              </a>
            )}
          </div>

          {/* Links */}
          <nav className="flex flex-col items-center sm:items-end gap-2 text-sm">
            <Link href={bookHref} className="text-gray-600 hover:text-amber-600 transition-colors font-medium">
              Book Appointment
            </Link>
            <a href="#reviews-section" className="text-gray-600 hover:text-amber-600 transition-colors">
              Reviews
            </a>
            <a href="#services-section" className="text-gray-600 hover:text-amber-600 transition-colors">
              Services
            </a>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-50 py-4 text-center">
          <p className="text-xs text-gray-400">
            Powered by{" "}
            <span className="font-semibold text-gray-500">Zaloon</span>
          </p>
        </div>
      </footer>
    </main>
  );
}
