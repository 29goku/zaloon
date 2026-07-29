import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CancelAppointmentForm } from "./cancel-form";

export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string): string {
  if (!time) return "—";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

/** Returns true if appointment is > 2 hours from now */
function isCancellable(dateStr: string, startTime: string, status: string): boolean {
  if (status !== "SCHEDULED") return false;
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, m] = startTime.split(":").map(Number);
  const apptDate = new Date(y, mo - 1, d, h, m, 0);
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
  return apptDate > twoHoursFromNow;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const statusStyles: Record<string, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-100",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-100",
  COMPLETED: "bg-green-50 text-green-700 border-green-100",
  CANCELLED: "bg-stone-100 text-stone-500 border-stone-200",
  NO_SHOW: "bg-red-50 text-red-600 border-red-100",
};

const statusLabels: Record<string, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

function StatusBadge({ status }: { status: string }) {
  const cls = statusStyles[status] ?? "bg-stone-100 text-stone-600 border-stone-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}

// ─── Google Calendar URL builder ──────────────────────────────────────────────

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

  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    ...(description ? { details: description } : {}),
    ...(location ? { location } : {}),
  });

  return `https://calendar.google.com/calendar/r/eventedit?${p.toString()}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ slug: string; id: string }>;
}

export default async function AppointmentDetailPage({ params }: PageProps) {
  const { slug, id: appointmentId } = await params;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      Salon: {
        select: {
          name: true,
          slug: true,
          address: true,
          city: true,
          country: true,
          phone: true,
          email: true,
        },
      },
      Staff: {
        select: { id: true, name: true, avatar: true },
      },
      Client: {
        select: { id: true, name: true, phone: true },
      },
      AppointmentService: {
        include: {
          Service: {
            select: { id: true, name: true, price: true, durationMins: true },
          },
        },
      },
      Review: {
        select: { id: true, rating: true, comment: true },
      },
    },
  });

  if (!appointment || appointment.Salon.slug !== slug) {
    notFound();
  }

  const salon = appointment.Salon;
  const services = appointment.AppointmentService.map((as) => as.Service);
  const totalDuration = services.reduce((sum, s) => sum + s.durationMins, 0);
  const serviceNames = services.map((s) => s.name).join(", ");

  const calTitle = `${serviceNames} at ${salon.name}`;
  const calDesc = `With ${appointment.Staff.name}`;
  const calLocation = [salon.name, salon.address, salon.city].filter(Boolean).join(", ");

  const googleCalUrl = buildGoogleCalendarUrl({
    title: calTitle,
    date: appointment.date,
    startTime: appointment.startTime,
    durationMins: totalDuration,
    location: calLocation,
    description: calDesc,
  });

  const icsUrl = `/portal/${slug}/appointment/${appointmentId}/calendar`;
  const cancellable = isCancellable(appointment.date, appointment.startTime, appointment.status);

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-5">
      {/* Back link */}
      <Link
        href={`/portal/${slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to portal
      </Link>

      {/* Main card */}
      <div className="rounded-2xl border border-stone-100 bg-white shadow-sm overflow-hidden">
        {/* Header band */}
        <div className="bg-stone-50 border-b border-stone-100 px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <p className="font-bold text-stone-900 text-base">
              {serviceNames || "Appointment"}
            </p>
            <p className="text-sm text-stone-500 mt-0.5">
              {formatDate(appointment.date)} at {formatTime(appointment.startTime)}
            </p>
          </div>
          <StatusBadge status={appointment.status} />
        </div>

        <div className="divide-y divide-stone-100">
          {/* Services */}
          <div className="px-6 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3">
              Services
            </p>
            <div className="space-y-2">
              {services.map((svc) => (
                <div key={svc.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-stone-700">{svc.name}</span>
                    <span className="text-stone-400 ml-2 text-xs">
                      {formatDuration(svc.durationMins)}
                    </span>
                  </div>
                  <span className="font-medium text-stone-600">
                    {formatCurrency(svc.price)}
                  </span>
                </div>
              ))}
              {services.length > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-sm font-semibold text-stone-800">
                  <span>Total</span>
                  <span>{formatCurrency(appointment.totalAmount)}</span>
                </div>
              )}
              {services.length === 1 && (
                <div className="flex items-center justify-between pt-1 text-sm font-semibold text-stone-800">
                  <span>Total</span>
                  <span>{formatCurrency(appointment.totalAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Staff */}
          <div className="px-6 py-4 flex items-center gap-3">
            {appointment.Staff.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={appointment.Staff.avatar}
                alt={appointment.Staff.name}
                className="w-9 h-9 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                {appointment.Staff.name.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 leading-none mb-0.5">
                Stylist
              </p>
              <p className="text-sm font-medium text-stone-700">
                {appointment.Staff.name}
              </p>
            </div>
          </div>

          {/* Duration */}
          <div className="px-6 py-3 text-sm text-stone-500 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
              Duration
            </span>
            <span>{formatDuration(totalDuration)}</span>
          </div>

          {/* Notes */}
          {appointment.notes && (
            <div className="px-6 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">
                Notes
              </p>
              <p className="text-sm text-stone-500 italic">{appointment.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Review — if completed but no review yet */}
      {appointment.status === "COMPLETED" && !appointment.Review && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-stone-800">How was your visit?</p>
            <p className="text-xs text-stone-500 mt-0.5">Share your feedback with us.</p>
          </div>
          <Link
            href={`/book/${slug}/review/${appointmentId}`}
            className="shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
          >
            Leave a review
          </Link>
        </div>
      )}

      {/* Existing review */}
      {appointment.Review && (
        <div className="rounded-xl border border-stone-100 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">
            Your Review
          </p>
          <div className="flex items-center gap-1 mb-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={`w-4 h-4 ${
                  star <= appointment.Review!.rating
                    ? "text-amber-400"
                    : "text-stone-200"
                }`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>
          {appointment.Review.comment && (
            <p className="text-sm text-stone-600 italic">
              &ldquo;{appointment.Review.comment}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Add to calendar */}
      {appointment.status === "SCHEDULED" && (
        <div className="rounded-xl border border-stone-100 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3">
            Add to Calendar
          </p>
          <div className="grid grid-cols-3 gap-2">
            <a
              href={googleCalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 h-14 px-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-medium hover:bg-stone-50 transition-colors justify-center text-center"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </a>

            <a
              href={icsUrl}
              download={`zaloon-booking-${appointmentId.slice(-6).toUpperCase()}.ics`}
              className="flex flex-col items-center gap-1.5 h-14 px-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-medium hover:bg-stone-50 transition-colors justify-center text-center"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              .ics file
            </a>

            <a
              href={icsUrl}
              className="flex flex-col items-center gap-1.5 h-14 px-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-medium hover:bg-stone-50 transition-colors justify-center text-center"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Apple
            </a>
          </div>
        </div>
      )}

      {/* Cancel — only if SCHEDULED and > 2h away */}
      {cancellable && (
        <CancelAppointmentForm appointmentId={appointmentId} slug={slug} />
      )}

      {/* Book again */}
      <Link
        href={`/book/${slug}`}
        className="flex items-center justify-center gap-2 w-full rounded-xl bg-rose-500 py-3 text-sm font-semibold text-white hover:bg-rose-600 transition-colors shadow-sm shadow-rose-200"
      >
        Book a new appointment
      </Link>
    </div>
  );
}
