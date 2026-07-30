import { Settings2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getServiceBookingSettings } from "@/app/actions/settings";
import { ServiceBookingSettingsClient } from "./service-booking-settings-client";

export const dynamic = "force-dynamic";

export default async function ServiceBookingSettingsPage() {
  const salon = await prisma.salon.findFirst({ select: { id: true } });

  const services = salon
    ? await prisma.service.findMany({
        where: { salonId: salon.id, active: true },
        select: { id: true, name: true, price: true, durationMins: true },
        orderBy: { name: "asc" },
      })
    : [];

  const settings = await getServiceBookingSettings();

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/dashboard/services"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Services
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Settings2 className="w-7 h-7 text-primary" />
          Service Booking Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure per-service booking rules: advance limits, gaps, deposit requirements, and booking notes.
        </p>
      </div>

      <ServiceBookingSettingsClient services={services} initialSettings={settings} />
    </div>
  );
}
