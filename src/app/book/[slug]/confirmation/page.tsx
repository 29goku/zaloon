"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Calendar, Clock, User, Scissors, Download, RefreshCw } from "lucide-react";

export default function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const searchParams = useSearchParams();

  // Params passed via query string from the booking wizard
  const serviceName = searchParams.get("service") ?? "Your appointment";
  const date = searchParams.get("date") ?? "";
  const time = searchParams.get("time") ?? "";
  const staffName = searchParams.get("staff") ?? "";
  const total = searchParams.get("total") ?? "";
  const appointmentId = searchParams.get("id") ?? "";
  const salonName = searchParams.get("salon") ?? "Your Salon";
  const clientId = searchParams.get("clientId") ?? "";
  const slug = searchParams.get("slug") ?? "";

  const formattedDate = date
    ? new Date(date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const googleCalendarUrl = (() => {
    if (!date || !time) return null;
    const startDt = new Date(`${date}T${time}:00`);
    const endDt = new Date(startDt.getTime() + 60 * 60 * 1000);
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z/, "Z");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `${serviceName} at ${salonName}`,
      dates: `${fmt(startDt)}/${fmt(endDt)}`,
      details: staffName ? `Appointment with ${staffName}` : "",
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  })();

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      data-theme="light"
    >
      <div className="w-full max-w-md space-y-6">
        {/* Success hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100">
            <CheckCircle2 className="w-10 h-10 text-green-600" style={{ animation: "scaleIn 0.4s ease-out" }} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Booking Confirmed!</h1>
          <p className="text-gray-500 text-sm">
            We look forward to seeing you. A confirmation has been saved.
          </p>
        </div>

        {/* Appointment details card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Appointment Details
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-800">
              <Scissors className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="font-medium">{serviceName}</span>
            </div>
            {formattedDate && (
              <div className="flex items-center gap-3 text-gray-800">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{formattedDate}</span>
              </div>
            )}
            {time && (
              <div className="flex items-center gap-3 text-gray-800">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{time}</span>
              </div>
            )}
            {staffName && (
              <div className="flex items-center gap-3 text-gray-800">
                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>with {staffName}</span>
              </div>
            )}
            {total && (
              <div className="pt-3 border-t border-gray-100 flex justify-between text-sm">
                <span className="text-gray-500">Total (pay at salon)</span>
                <span className="font-semibold text-gray-900">${total}</span>
              </div>
            )}
            {appointmentId && (
              <div className="text-xs text-gray-400 pt-1">
                Ref: #{appointmentId.slice(-8).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Add to calendar */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Add to Calendar
          </h2>
          <div className="flex gap-3">
            {googleCalendarUrl && (
              <a
                href={googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Google
              </a>
            )}
            {appointmentId && (
              <a
                href={`/api/calendar/${appointmentId}`}
                download
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Apple / .ics
              </a>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <Link
            href={`/book/${slug || "."}`}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Book Another Appointment
          </Link>
          {clientId && slug && (
            <Link
              href={`/portal/${slug}/${clientId}`}
              className="w-full inline-flex items-center justify-center px-5 py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Manage My Bookings
            </Link>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
