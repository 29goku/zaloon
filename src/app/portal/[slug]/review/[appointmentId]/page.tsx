import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ReviewForm } from "@/app/book/[slug]/review/[appointmentId]/review-form";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string; appointmentId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const salon = await prisma.salon.findFirst({
    where: { slug },
    select: { name: true },
  });
  return {
    title: salon ? `Leave a Review — ${salon.name}` : "Leave a Review",
  };
}

export default async function PortalReviewPage({ params }: PageProps) {
  const { slug, appointmentId } = await params;

  const salon = await prisma.salon.findFirst({
    where: { slug },
    select: { id: true, name: true, slug: true, logo: true },
  });

  if (!salon) notFound();

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId, salonId: salon.id },
    select: {
      id: true,
      date: true,
      clientId: true,
      Client: { select: { name: true } },
      Staff: { select: { id: true, name: true } },
      Review: { select: { id: true } },
    },
  });

  if (!appointment) notFound();

  const alreadyReviewed = !!appointment.Review;

  const dateLabel = appointment.date
    ? new Date(appointment.date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-stone-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-5 flex flex-col items-center text-center gap-3">
          {salon.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={salon.logo}
              alt={salon.name}
              className="w-14 h-14 rounded-xl object-cover shadow-sm"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-xl shadow-sm shadow-amber-200 select-none">
              {salon.name.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-lg font-bold text-stone-900">{salon.name}</h1>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 sm:p-8">
          {alreadyReviewed ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-stone-900 mb-2">Already Reviewed</h2>
              <p className="text-stone-500 text-sm">
                A review has already been submitted for this appointment. Thank you!
              </p>
            </div>
          ) : (
            <>
              {/* Appointment context heading */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-stone-900">How was your experience?</h2>
                {appointment.Staff?.name && dateLabel && (
                  <p className="text-stone-500 text-sm mt-1">
                    with{" "}
                    <span className="font-semibold text-stone-700">{appointment.Staff.name}</span>{" "}
                    on {dateLabel}
                  </p>
                )}
                {appointment.Staff?.name && !dateLabel && (
                  <p className="text-stone-500 text-sm mt-1">
                    with{" "}
                    <span className="font-semibold text-stone-700">{appointment.Staff.name}</span>
                  </p>
                )}
              </div>

              <ReviewForm
                appointmentId={appointmentId}
                clientId={appointment.clientId ?? undefined}
                staffId={appointment.Staff?.id}
                staffName={appointment.Staff?.name}
                salonName={salon.name}
              />
            </>
          )}
        </div>

        <p className="text-center text-xs text-stone-300 mt-6">
          Powered by <span className="font-semibold text-stone-400">Zaloon</span>
        </p>
      </div>
    </div>
  );
}
