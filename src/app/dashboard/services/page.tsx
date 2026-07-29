import { prisma } from "@/lib/prisma";
import { Scissors, Package2, BarChart2, Layers } from "lucide-react";
import Link from "next/link";
import { AddServiceDialog } from "@/components/services/add-service-dialog";
import { AddCategoryDialog } from "@/components/services/add-category-dialog";
import { InlineCategoryAdd } from "@/components/services/inline-category-add";
import { BulkPriceDialog } from "@/components/services/bulk-price-dialog";
import { ServicesPageClient } from "@/components/services/services-page-client";
import { ServicesAnalyticsTab } from "@/components/services/services-analytics-tab";

export const dynamic = "force-dynamic";

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "analytics" ? "analytics" : "services";

  const salon = await prisma.salon.findFirst();
  const currency = salon?.currency ?? "USD";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  // Load categories with services + staff + booking counts
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

  // Respect saved category order from businessHours.__categoryOrder
  let savedOrder: string[] = [];
  if (salon?.businessHours) {
    try {
      const bh = JSON.parse(salon.businessHours) as Record<string, unknown>;
      if (Array.isArray(bh.__categoryOrder)) {
        savedOrder = bh.__categoryOrder as string[];
      }
    } catch {
      savedOrder = [];
    }
  }

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

  // Apply saved order if present
  const orderedCategories =
    savedOrder.length > 0
      ? [
          ...savedOrder
            .map((id) => normalizedCategories.find((c) => c.id === id))
            .filter(Boolean),
          ...normalizedCategories.filter((c) => !savedOrder.includes(c.id)),
        ].filter(Boolean)
      : normalizedCategories;

  const allCategoryStubs = normalizedCategories.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
  }));

  // Stats
  const totalServices = normalizedCategories.reduce(
    (sum, cat) => sum + cat.services.length,
    0
  );
  const activeServices = normalizedCategories.reduce(
    (sum, cat) => sum + cat.services.filter((s) => s.active).length,
    0
  );
  const allPrices = normalizedCategories.flatMap((cat) =>
    cat.services.map((s) => s.price)
  );
  const avgPrice =
    allPrices.length > 0
      ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length
      : 0;

  // Analytics: top 8 services by booking count (this month)
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  const thisMonthStr = thisMonthStart.toISOString().slice(0, 10);

  // Compute per-service monthly bookings & revenue from AppointmentService
  const apptServicesThisMonth = await prisma.appointmentService.findMany({
    where: {
      Appointment: { date: { gte: thisMonthStr } },
      Service: { salonId: salon?.id ?? "" },
    },
    include: {
      Service: { select: { id: true, name: true, price: true, durationMins: true } },
      Appointment: { select: { date: true, totalAmount: true } },
    },
  });

  // Aggregate: per service id → count + revenue
  const serviceStatsMap = new Map<
    string,
    { name: string; count: number; revenue: number; durationMins: number }
  >();
  for (const as of apptServicesThisMonth) {
    const existing = serviceStatsMap.get(as.serviceId) ?? {
      name: as.Service.name,
      count: 0,
      revenue: 0,
      durationMins: as.Service.durationMins,
    };
    existing.count++;
    existing.revenue += as.Service.price;
    serviceStatsMap.set(as.serviceId, existing);
  }

  const topServices = Array.from(serviceStatsMap.entries())
    .map(([id, stats]) => ({ id, ...stats }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <div className="p-4 md:p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Services</p>
          <p className="text-2xl font-bold mt-1">{totalServices}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Active</p>
          <p className="text-2xl font-bold mt-1 text-green-500">{activeServices}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Price</p>
          <p className="text-2xl font-bold mt-1">{fmt(avgPrice)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Categories</p>
          <p className="text-2xl font-bold mt-1">{normalizedCategories.length}</p>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        <Link
          href="/dashboard/services"
          className={[
            "px-4 py-2 text-sm font-semibold transition-colors flex items-center gap-1.5",
            activeTab === "services"
              ? "text-primary border-b-2 border-primary -mb-px"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          <Scissors className="w-4 h-4" />
          Services
        </Link>
        <Link
          href="/dashboard/services?tab=analytics"
          className={[
            "px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5",
            activeTab === "analytics"
              ? "text-primary border-b-2 border-primary -mb-px"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          <BarChart2 className="w-4 h-4" />
          Analytics
        </Link>
        <Link
          href="/dashboard/services/packages"
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          <Package2 className="w-4 h-4" />
          Packages
        </Link>
        <Link
          href="/dashboard/services/addons"
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          <Layers className="w-4 h-4" />
          Add-ons
        </Link>
      </div>

      {activeTab === "analytics" ? (
        <ServicesAnalyticsTab topServices={topServices} fmt={fmt} />
      ) : normalizedCategories.length === 0 ? (
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
            categories={orderedCategories as typeof normalizedCategories}
            allCategories={allCategoryStubs}
            fmt={fmt}
          />
        </div>
      )}
    </div>
  );
}
