import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string; clientId: string }>;
}

type PastAppt = {
  id: string;
  date: string;
  startTime: string;
  totalAmount: number;
  Staff: { id: string; name: string };
  AppointmentService: { Service: { id: string; name: string } }[];
};

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string): string {
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

async function getLastVisits(slug: string, clientId: string): Promise<{
  salonSlug: string;
  appointments: PastAppt[];
} | null> {
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  });
  if (!salon) return null;

  const client = await prisma.client.findFirst({
    where: { id: clientId, salonId: salon.id },
    select: { id: true },
  });
  if (!client) return null;

  const appointments = await prisma.appointment.findMany({
    where: { clientId, salonId: salon.id, status: "COMPLETED" },
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
    take: 3,
    select: {
      id: true,
      date: true,
      startTime: true,
      totalAmount: true,
      Staff: { select: { id: true, name: true } },
      AppointmentService: {
        select: { Service: { select: { id: true, name: true } } },
      },
    },
  });

  return { salonSlug: salon.slug, appointments: appointments as PastAppt[] };
}

export default async function RebookPage({ params }: PageProps) {
  const { slug, clientId } = await params;
  const data = await getLastVisits(slug, clientId);

  if (!data) notFound();

  const { salonSlug, appointments } = data;

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
      {/* Back link */}
      <Link
        href={`/portal/${slug}/${clientId}`}
        className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to my account
      </Link>

      {/* Heading */}
      <div>
        <h1 className="text-xl font-bold text-stone-900">Book again</h1>
        <p className="text-sm text-stone-400 mt-1">
          Pick up from where you left off — rebook the same services with one tap.
        </p>
      </div>

      {appointments.length === 0 ? (
        <div className="rounded-xl border border-stone-100 bg-white px-6 py-12 text-center shadow-sm">
          <svg
            className="w-10 h-10 text-stone-300 mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <p className="text-stone-500 text-sm mb-4">No past appointments yet.</p>
          <Link
            href={`/book/${salonSlug}`}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 transition-colors"
          >
            Book your first appointment
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => {
            const serviceIds = appt.AppointmentService.map((as) => as.Service.id);
            const serviceNames = appt.AppointmentService.map((as) => as.Service.name);
            const rebookUrl = `/book/${salonSlug}?services=${serviceIds.join(",")}&staff=${appt.Staff.id}`;

            return (
              <div
                key={appt.id}
                className="rounded-xl border border-stone-100 bg-white p-5 shadow-sm space-y-4"
              >
                {/* Visit info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-900 text-sm leading-snug">
                      {serviceNames.join(", ") || "—"}
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      {formatDate(appt.date)} at {formatTime(appt.startTime)}
                    </p>
                    <p className="text-xs text-stone-500">
                      with {appt.Staff.name}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-stone-900">
                      {formatCurrency(appt.totalAmount)}
                    </p>
                    <span className="inline-block mt-1 text-xs text-stone-400">
                      {appt.AppointmentService.length} service
                      {appt.AppointmentService.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Services chips */}
                <div className="flex flex-wrap gap-1.5">
                  {appt.AppointmentService.map((as) => (
                    <span
                      key={as.Service.id}
                      className="inline-block rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600"
                    >
                      {as.Service.name}
                    </span>
                  ))}
                </div>

                {/* Rebook CTA */}
                <Link
                  href={rebookUrl}
                  className="flex items-center justify-center gap-2 w-full rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 transition-colors shadow-sm shadow-rose-200"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Book same services again
                </Link>
              </div>
            );
          })}

          {/* Or choose something new */}
          <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-5 py-4 text-center">
            <p className="text-sm text-stone-500 mb-2">
              Want to try something different?
            </p>
            <Link
              href={`/book/${salonSlug}`}
              className="text-sm font-semibold text-rose-500 hover:underline"
            >
              Browse all services
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
