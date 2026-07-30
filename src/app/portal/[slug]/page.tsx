import Link from "next/link";
import { PhoneSearchForm } from "./phone-search-form";
import { getSalonBranding } from "./portal-data";

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function PortalLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ phone?: string }>;
}) {
  const { slug } = await params;
  const { phone } = await searchParams;

  const salon = await getSalonBranding(slug);

  if (!salon) {
    return (
      <div className="flex min-h-96 items-center justify-center p-6">
        <p className="text-stone-400">Salon not found.</p>
      </div>
    );
  }

  const notFound = !!phone; // phone was provided but no client matched

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
          Find my appointments
        </h2>
        <p className="text-sm text-stone-400 mb-5">
          Enter your phone number to access your account.
        </p>

        {notFound && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            No account found for that number.{" "}
            <Link
              href={`/book/${slug}`}
              className="font-semibold underline hover:text-amber-900"
            >
              Book your first appointment
            </Link>
          </div>
        )}

        <PhoneSearchForm slug={slug} />
      </div>

      {/* Salon info card */}
      <div className="rounded-xl border border-stone-100 bg-white p-5 shadow-sm space-y-3">
        <h2 className="font-semibold text-stone-900 text-sm">About {salon.name}</h2>
        <dl className="space-y-2 text-sm">
          {salon.address && (
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span className="text-stone-600">{salon.address}{salon.city ? `, ${salon.city}` : ""}</span>
            </div>
          )}
          {!salon.address && salon.city && (
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span className="text-stone-600">{salon.city}</span>
            </div>
          )}
          {salon.phone && (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              <a href={`tel:${salon.phone}`} className="text-stone-600 hover:text-rose-500 transition-colors">
                {salon.phone}
              </a>
            </div>
          )}
          {salon.businessHours && (
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-stone-600 whitespace-pre-line">{salon.businessHours}</span>
            </div>
          )}
        </dl>
        <Link
          href={`/book/${slug}`}
          className="flex items-center justify-center gap-2 w-full rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 transition-colors shadow-sm shadow-rose-200 mt-2"
        >
          Book an appointment
        </Link>
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
