import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string; appointmentId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Manage Booking — Zaloon`,
    description: `View and manage your appointment at ${slug}.`,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

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

// Status config: label, colour classes, icon path
const STATUS_CONFIG: Record<
  string,
  { label: string; badgeCls: string; bannerCls: string; icon: string }
> = {
  SCHEDULED: {
    label: "Confirmed",
    badgeCls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    bannerCls: "bg-emerald-50 border-emerald-100",
    icon: "M5 13l4 4L19 7",
  },
  COMPLETED: {
    label: "Completed",
    badgeCls: "bg-sky-100 text-sky-700 border-sky-200",
    bannerCls: "bg-sky-50 border-sky-100",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  CANCELLED: {
    label: "Cancelled",
    badgeCls: "bg-red-100 text-red-700 border-red-200",
    bannerCls: "bg-red-50 border-red-100",
    icon: "M6 18L18 6M6 6l12 12",
  },
  NO_SHOW: {
    label: "No Show",
    badgeCls: "bg-amber-100 text-amber-700 border-amber-200",
    bannerCls: "bg-amber-50 border-amber-100",
    icon: "M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z",
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ManageBookingPage({ params, searchParams }: PageProps) {
  const { slug, appointmentId } = await params;
  const { cancelled } = await searchParams;
  const justCancelled = cancelled === "1";

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

  if (!appointment || appointment.Salon.slug !== slug) {
    notFound();
  }

  const salon = appointment.Salon;
  const services = appointment.AppointmentService.map((as) => as.Service);
  const totalDuration = services.reduce((sum, s) => sum + s.durationMins, 0);
  const shortId = appointment.id.slice(-6).toUpperCase();
  const status = appointment.status;

  const statusCfg =
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.SCHEDULED;

  const isCancellable = status === "SCHEDULED";
  const isTerminal = status === "CANCELLED" || status === "COMPLETED" || status === "NO_SHOW";

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-stone-50">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
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
            {salon.city && <p className="text-xs text-stone-400">{salon.city}</p>}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-10">
        {/* ─── Just-cancelled flash ────────────────────────────────────────── */}
        {justCancelled && (
          <div className="mb-6 flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            <svg
              className="w-4 h-4 mt-0.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Your appointment has been cancelled successfully.</span>
          </div>
        )}

        {/* ─── Main card ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-xl border border-stone-100 overflow-hidden">
          {/* Page title */}
          <div className="px-6 pt-6 pb-4 border-b border-stone-100">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-stone-900">Manage Booking</h1>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusCfg.badgeCls}`}
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={statusCfg.icon} />
                </svg>
                {statusCfg.label}
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Ref: <span className="font-mono font-semibold text-stone-600">{shortId}</span>
            </p>
          </div>

          {/* Terminal status banner */}
          {isTerminal && !justCancelled && (
            <div className={`mx-6 mt-5 px-4 py-3 rounded-xl border text-sm ${statusCfg.bannerCls}`}>
              <p className="font-medium">
                {status === "CANCELLED" && "This appointment has been cancelled."}
                {status === "COMPLETED" && "This appointment has been completed. Thank you for your visit!"}
                {status === "NO_SHOW" && "This appointment was marked as no-show."}
              </p>
            </div>
          )}

          {/* ─── Appointment details ───────────────────────────────────────── */}
          <div className="divide-y divide-stone-100 mx-6 mt-5 rounded-xl border border-stone-100 overflow-hidden text-sm">
            {/* Services */}
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
              <p className="font-medium text-stone-700">
                {formatDateDisplay(appointment.date)}
              </p>
              <p className="text-stone-500 text-xs mt-0.5">
                {formatTimeDisplay(appointment.startTime)} &middot; {formatDuration(totalDuration)}
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
                  Staff
                </p>
                <p className="font-medium text-stone-700">{appointment.Staff.name}</p>
              </div>
            </div>

            {/* Salon location */}
            {(salon.address || salon.city) && (
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">
                  Location
                </p>
                <p className="font-medium text-stone-700">{salon.name}</p>
                {salon.address && (
                  <p className="text-stone-500 text-xs mt-0.5">{salon.address}</p>
                )}
                {salon.city && (
                  <p className="text-stone-500 text-xs">
                    {[salon.city, salon.country].filter(Boolean).join(", ")}
                  </p>
                )}
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

          {/* ─── Actions ──────────────────────────────────────────────────── */}
          {!isTerminal && (
            <div className="mx-6 mt-5 space-y-3">
              {/* Reschedule */}
              <Link
                href={`/book/${slug}?reschedule=${appointmentId}`}
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition-colors shadow-sm shadow-rose-200"
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
                Reschedule Appointment
              </Link>

              {/* Cancel — visible only while cancellable */}
              {isCancellable && (
                <form
                  action={`/book/${slug}/confirmation/${appointmentId}/cancel`}
                  method="POST"
                >
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border-2 border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 hover:border-red-300 transition-colors"
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
                      className="w-4 h-4"
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
                    Cancel Appointment
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ─── Contact salon ─────────────────────────────────────────────── */}
          {(salon.phone || salon.email) && (
            <div className="mx-6 mt-5 px-4 py-3 bg-rose-50 rounded-xl border border-rose-100">
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

          {/* Book another */}
          <div className="mx-6 mt-4 mb-6">
            <Link
              href={`/book/${slug}`}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border-2 border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 hover:border-stone-300 transition-colors"
            >
              Book Another Appointment
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-stone-300 mt-8">
          Powered by <span className="font-semibold text-stone-400">Zaloon</span>
        </p>
      </main>
    </div>
  );
}
