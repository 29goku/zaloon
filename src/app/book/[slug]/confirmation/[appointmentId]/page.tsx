import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string; appointmentId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Booking Confirmed — Zaloon`,
    description: `Your appointment at ${slug} has been confirmed.`,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format a date string as "Monday, July 29" (no year — matches task spec format).
 * Input is "YYYY-MM-DD" stored as local salon time.
 */
function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Format "HH:MM" → "3:00 PM" */
function formatTimeDisplay(time: string): string {
  if (!time) return "—";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function formatPrice(price: number, currency: string | null): string {
  const c = currency ?? "USD";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(price);
  } catch {
    return `${c} ${price.toFixed(2)}`;
  }
}

/**
 * Build a Google Calendar "Add to Calendar" deep link.
 * Uses local (floating) time — consistent with how we store date/time in DB.
 */
function buildGoogleCalendarUrl({
  title,
  date,
  startTime,
  durationMins,
  location,
  description,
}: {
  title: string;
  date: string;
  startTime: string;
  durationMins: number;
  location?: string;
  description?: string;
}): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = startTime.split(":").map(Number);

  const start = new Date(year, month - 1, day, hour, minute, 0);
  const end = new Date(start.getTime() + durationMins * 60 * 1000);

  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    ...(description ? { details: description } : {}),
    ...(location ? { location } : {}),
  });

  return `https://calendar.google.com/calendar/r/eventedit?${params.toString()}`;
}

// ─── What to expect checklist items ───────────────────────────────────────────

const WHAT_TO_EXPECT = [
  { text: "Arrive 5 minutes early so we can get started on time." },
  { text: "Bring valid ID if this is your first visit." },
  { text: "Feel free to discuss your preferences with your stylist." },
  { text: "Payment is collected after your appointment." },
  { text: "Need to cancel? Please give us 24 hours notice." },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ConfirmationPage({ params }: PageProps) {
  const { slug, appointmentId } = await params;

  // Load appointment with all related data
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      Salon: {
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
          currency: true,
        },
      },
      Staff: {
        select: { id: true, name: true, avatar: true },
      },
      Client: {
        select: { name: true, phone: true, email: true },
      },
      AppointmentService: {
        include: {
          Service: {
            select: { id: true, name: true, price: true, durationMins: true },
          },
        },
      },
    },
  });

  // Guard: appointment must exist and belong to this salon's slug
  if (!appointment || appointment.Salon.slug !== slug) {
    notFound();
  }

  const salon = appointment.Salon;
  const services = appointment.AppointmentService.map((as) => as.Service);
  const totalDuration = services.reduce((sum, s) => sum + s.durationMins, 0);
  const shortId = appointment.id.slice(-6).toUpperCase();

  // Build calendar metadata
  const serviceNames = services.map((s) => s.name).join(", ");
  const calendarTitle = `${serviceNames} at ${salon.name}`;
  const calendarDescription = `With ${appointment.Staff.name}\nBooking ref: ${shortId}`;
  const locationParts = [salon.name, salon.address, salon.city].filter(Boolean);
  const calendarLocation = locationParts.join(", ");

  const googleCalendarUrl = buildGoogleCalendarUrl({
    title: calendarTitle,
    date: appointment.date,
    startTime: appointment.startTime,
    durationMins: totalDuration,
    location: calendarLocation,
    description: calendarDescription,
  });

  // ICS download URL — served by the calendar route handler
  const icsUrl = `/book/${slug}/confirmation/${appointmentId}/calendar`;
  // Apple Calendar uses the same .ics format
  const appleCalendarUrl = icsUrl;

  // Formatted date+time for the summary card: "Monday, July 29 at 3:00 PM"
  const formattedDateTime = `${formatDateDisplay(appointment.date)} at ${formatTimeDisplay(appointment.startTime)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-stone-50">
      {/* ─── Salon mini-header ───────────────────────────────────────────────── */}
      <header className="bg-white border-b border-stone-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-5 flex items-center gap-4">
          {salon.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={salon.logo}
              alt={salon.name}
              className="w-12 h-12 rounded-xl object-cover shadow-sm shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white font-bold text-xl shadow-sm shadow-rose-100 shrink-0 select-none">
              {salon.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-bold text-stone-900">{salon.name}</p>
            {salon.city && (
              <p className="text-xs text-stone-400">{salon.city}</p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-10 space-y-5">
        {/* ─── Success hero card ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-xl border border-stone-100 overflow-hidden">
          {/* Green top band */}
          <div className="bg-emerald-500 px-6 pt-8 pb-6 text-center">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Booking Confirmed!</h1>
            <p className="text-emerald-100 text-sm">
              Your appointment has been submitted. We&apos;ll be in touch to confirm.
            </p>
          </div>

          {/* Reference badge */}
          <div className="flex justify-center -mt-4 px-6">
            <div className="inline-flex flex-col items-center px-8 py-3 bg-white rounded-2xl border border-stone-100 shadow-md">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-0.5">
                Booking Reference
              </p>
              <p className="text-2xl font-bold font-mono text-rose-600 tracking-[0.15em]">
                {shortId}
              </p>
            </div>
          </div>

          {/* ─── Booking Summary ────────────────────────────────────────────── */}
          <div className="divide-y divide-stone-100 mx-6 mt-6 rounded-xl border border-stone-100 overflow-hidden text-sm">
            {/* Salon name + address */}
            <div className="px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">
                Salon
              </p>
              <p className="font-semibold text-stone-800">{salon.name}</p>
              {salon.address && (
                <p className="text-stone-500 text-xs mt-0.5">{salon.address}</p>
              )}
              {salon.city && (
                <p className="text-stone-500 text-xs">
                  {[salon.city, salon.country].filter(Boolean).join(", ")}
                </p>
              )}
            </div>

            {/* Services with duration */}
            <div className="px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">
                Services
              </p>
              <div className="space-y-1.5">
                {services.map((svc) => (
                  <div key={svc.id} className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-stone-700">{svc.name}</span>
                      <span className="text-stone-400 ml-2 text-xs">
                        {formatDuration(svc.durationMins)}
                      </span>
                    </div>
                    <span className="text-stone-600 font-medium">
                      {formatPrice(svc.price, salon.currency)}
                    </span>
                  </div>
                ))}
                {services.length > 1 && (
                  <div className="flex justify-between pt-1.5 border-t border-stone-100 font-semibold text-stone-800">
                    <span>Total</span>
                    <span>{formatPrice(appointment.totalAmount, salon.currency)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Date & Time */}
            <div className="px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">
                Date &amp; Time
              </p>
              <p className="font-medium text-stone-700">{formattedDateTime}</p>
              <p className="text-stone-400 text-xs mt-0.5">
                Duration: {formatDuration(totalDuration)}
              </p>
            </div>

            {/* Staff */}
            <div className="px-4 py-3 flex items-center gap-3">
              {appointment.Staff.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={appointment.Staff.avatar}
                  alt={appointment.Staff.name}
                  className="w-8 h-8 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-semibold text-xs uppercase shrink-0">
                  {appointment.Staff.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 leading-none mb-0.5">
                  With
                </p>
                <p className="font-medium text-stone-700">{appointment.Staff.name}</p>
              </div>
            </div>

            {/* Total price (single service case — shown here; multi shows above) */}
            {services.length === 1 && (
              <div className="px-4 py-3 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  Total Price
                </p>
                <p className="font-semibold text-stone-800">
                  {formatPrice(appointment.totalAmount, salon.currency)}
                </p>
              </div>
            )}

            {/* Client */}
            {appointment.Client && (
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">
                  Your Details
                </p>
                <p className="font-medium text-stone-700">{appointment.Client.name}</p>
                {appointment.Client.phone && (
                  <p className="text-stone-500 text-xs mt-0.5">{appointment.Client.phone}</p>
                )}
                {appointment.Client.email && (
                  <p className="text-stone-500 text-xs">{appointment.Client.email}</p>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          {appointment.notes && (
            <div className="mx-6 mt-3 px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-sm text-stone-500 italic">
              &ldquo;{appointment.notes}&rdquo;
            </div>
          )}

          {/* ─── Add to Calendar ──────────────────────────────────────────── */}
          <div className="mx-6 mt-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3">
              Add to Calendar
            </p>
            <div className="grid grid-cols-3 gap-2">
              {/* Google Calendar */}
              <a
                href={googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 h-16 px-2 rounded-xl border-2 border-stone-200 text-stone-600 text-xs font-medium hover:bg-stone-50 hover:border-stone-300 transition-colors justify-center text-center"
              >
                {/* Google "G" mark approximation */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </a>

              {/* Download .ics */}
              <a
                href={icsUrl}
                download={`zaloon-booking-${shortId}.ics`}
                className="flex flex-col items-center gap-1.5 h-16 px-2 rounded-xl border-2 border-stone-200 text-stone-600 text-xs font-medium hover:bg-stone-50 hover:border-stone-300 transition-colors justify-center text-center"
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download .ics
              </a>

              {/* Apple Calendar */}
              <a
                href={appleCalendarUrl}
                className="flex flex-col items-center gap-1.5 h-16 px-2 rounded-xl border-2 border-stone-200 text-stone-600 text-xs font-medium hover:bg-stone-50 hover:border-stone-300 transition-colors justify-center text-center"
              >
                <svg
                  className="w-5 h-5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                Apple Calendar
              </a>
            </div>
          </div>

          {/* ─── Manage Booking ────────────────────────────────────────────── */}
          <div className="mx-6 mt-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3">
              Manage Your Booking
            </p>
            <div className="grid grid-cols-2 gap-2">
              {/* Cancel */}
              <form
                action={`/book/${slug}/confirmation/${appointmentId}/cancel`}
                method="POST"
              >
                <button
                  type="submit"
                  className="flex items-center justify-center gap-1.5 w-full h-11 rounded-xl border-2 border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 hover:border-red-300 transition-colors"
                  onClick={(e) => {
                    if (
                      !confirm(
                        "Are you sure you want to cancel this appointment? This cannot be undone."
                      )
                    ) {
                      e.preventDefault();
                    }
                  }}
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Cancel
                </button>
              </form>

              {/* Reschedule */}
              <Link
                href={`/book/${slug}?reschedule=${appointmentId}`}
                className="flex items-center justify-center gap-1.5 h-11 rounded-xl border-2 border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 hover:border-stone-300 transition-colors"
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Reschedule
              </Link>
            </div>

            {/* Manage booking full page link */}
            <Link
              href={`/book/${slug}/manage/${appointmentId}`}
              className="flex items-center justify-center gap-1.5 w-full mt-2 h-9 rounded-xl border border-stone-200 text-stone-400 text-xs font-medium hover:bg-stone-50 transition-colors"
            >
              View full booking details
            </Link>
          </div>

          {/* ─── What to expect ───────────────────────────────────────────── */}
          <div className="mx-6 mt-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3">
              What to Expect
            </p>
            <ul className="space-y-2">
              {WHAT_TO_EXPECT.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-stone-600">
                  <span className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full bg-emerald-100 flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-emerald-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>

          {/* ─── Salon contact ──────────────────────────────────────────────── */}
          {(salon.phone || salon.email) && (
            <div className="mx-6 mt-6 px-4 py-3 bg-rose-50 rounded-xl border border-rose-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400 mb-2">
                Contact {salon.name}
              </p>
              <div className="space-y-1">
                {salon.phone && (
                  <a
                    href={`tel:${salon.phone}`}
                    className="flex items-center gap-2 text-sm text-rose-600 hover:text-rose-700 transition-colors"
                  >
                    <svg
                      className="w-3.5 h-3.5 shrink-0"
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
                {salon.email && (
                  <a
                    href={`mailto:${salon.email}`}
                    className="flex items-center gap-2 text-sm text-rose-600 hover:text-rose-700 transition-colors"
                  >
                    <svg
                      className="w-3.5 h-3.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    {salon.email}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* ─── Book another ─────────────────────────────────────────────── */}
          <div className="mx-6 mt-5 mb-6">
            <Link
              href={`/book/${slug}`}
              className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition-colors shadow-sm shadow-rose-200"
            >
              <svg
                className="w-4 h-4"
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
              Book Another Appointment
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-stone-300">
          Powered by <span className="font-semibold text-stone-400">Zaloon</span>
        </p>
      </main>
    </div>
  );
}
