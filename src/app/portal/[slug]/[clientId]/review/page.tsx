import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PortalReviewForm } from "./review-form";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string; clientId: string }>;
}

async function getReviewPageData(slug: string, clientId: string) {
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true, name: true, logo: true },
  });
  if (!salon) return null;

  const client = await prisma.client.findFirst({
    where: { id: clientId, salonId: salon.id },
    select: { id: true, name: true },
  });
  if (!client) return null;

  const [staff, recentAppts] = await Promise.all([
    prisma.staff.findMany({
      where: { salonId: salon.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        clientId,
        salonId: salon.id,
        status: "COMPLETED",
        Review: null, // only unreviewed
      },
      orderBy: [{ date: "desc" }],
      take: 5,
      select: {
        id: true,
        date: true,
        Staff: { select: { id: true, name: true } },
        AppointmentService: {
          select: { Service: { select: { name: true } } },
        },
      },
    }),
  ]);

  return { salon, client, staff, recentAppts };
}

export default async function ClientReviewPage({ params }: PageProps) {
  const { slug, clientId } = await params;
  const data = await getReviewPageData(slug, clientId);

  if (!data) notFound();

  const { salon, client, staff, recentAppts } = data;

  const recentAppointments = recentAppts.map((a) => ({
    id: a.id,
    date: new Date(a.date + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    staffId: a.Staff.id,
    staffName: a.Staff.name,
    services:
      a.AppointmentService.map((as) => as.Service.name).join(", ") || "Services",
  }));

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

      {/* Header */}
      <div className="text-center space-y-2">
        {salon.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={salon.logo}
            alt={salon.name}
            className="w-14 h-14 rounded-xl object-cover shadow-sm mx-auto"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-xl shadow-sm shadow-amber-200 select-none mx-auto">
            {salon.name.charAt(0).toUpperCase()}
          </div>
        )}
        <h1 className="text-xl font-bold text-stone-900">
          How was your experience?
        </h1>
        <p className="text-sm text-stone-500">
          Hi {client.name.split(" ")[0]}! We&apos;d love to hear your feedback.
        </p>
      </div>

      {/* Review form */}
      <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        <PortalReviewForm
          clientId={clientId}
          salonId={salon.id}
          slug={slug}
          staffList={staff}
          recentAppointments={recentAppointments}
        />
      </div>
    </div>
  );
}
