import { prisma } from "@/lib/prisma";
import { Scissors, Package2 } from "lucide-react";
import Link from "next/link";
import { AddServiceDialog } from "@/components/services/add-service-dialog";
import { AddCategoryDialog } from "@/components/services/add-category-dialog";
import { InlineCategoryAdd } from "@/components/services/inline-category-add";
import { BulkPriceDialog } from "@/components/services/bulk-price-dialog";
import { ServicesPageClient } from "@/components/services/services-page-client";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const salon = await prisma.salon.findFirst();
  const currency = salon?.currency ?? "USD";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  // Load categories with services + staff + 30-day booking counts
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);

  const categories = await prisma.serviceCategory.findMany({
    include: {
      Service: {
        include: {
          StaffService: {
            include: { Staff: true },
          },
          AppointmentService: {
            include: {
              Appointment: {
                select: { date: true },
              },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const normalizedCategories = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    services: cat.Service.map((s) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      durationMins: s.durationMins,
      active: s.active,
      isAddon: s.isAddon,
      imageUrl: s.imageUrl,
      bufferTimeBefore: s.bufferTimeBefore,
      bufferTimeAfter: s.bufferTimeAfter,
      onlineBooking: s.onlineBooking,
      categoryId: s.categoryId,
      staff: s.StaffService.map((ss) => ({
        id: ss.Staff.id,
        name: ss.Staff.name,
        avatar: ss.Staff.avatar,
      })),
      bookingCount30d: s.AppointmentService.filter(
        (as) => as.Appointment.date >= thirtyDaysAgoStr
      ).length,
    })),
  }));

  const allCategoryStubs = normalizedCategories.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
  }));

  const totalServices = normalizedCategories.reduce(
    (sum, cat) => sum + cat.services.length,
    0
  );

  return (
    <div className="p-4 md:p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Services</h1>
          <p className="text-muted-foreground mt-1">
            {totalServices} service{totalServices !== 1 ? "s" : ""} across{" "}
            {normalizedCategories.length} categor
            {normalizedCategories.length !== 1 ? "ies" : "y"}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <BulkPriceDialog />
          <AddCategoryDialog />
          <AddServiceDialog categories={allCategoryStubs} />
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        <span className="px-4 py-2 text-sm font-semibold text-primary border-b-2 border-primary -mb-px flex items-center gap-1.5">
          <Scissors className="w-4 h-4" />
          Services
        </span>
        <Link
          href="/dashboard/services/packages"
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          <Package2 className="w-4 h-4" />
          Packages
        </Link>
      </div>

      {/* Empty state */}
      {normalizedCategories.length === 0 ? (
        <div className="text-center py-24">
          <Scissors className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">No services yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Start by adding a category, then add services inside it.
          </p>
          <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
            <InlineCategoryAdd />
            <AddCategoryDialog />
            <AddServiceDialog categories={[]} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Inline category add strip */}
          <div className="flex justify-end">
            <InlineCategoryAdd />
          </div>

          <ServicesPageClient
            categories={normalizedCategories}
            allCategories={allCategoryStubs}
            fmt={fmt}
          />
        </div>
      )}
    </div>
  );
}
