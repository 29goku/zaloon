import { prisma } from "@/lib/prisma";
import { Scissors, Package2, BarChart2, Layers, Plus } from "lucide-react";
import Link from "next/link";
import { AddServiceDialog } from "@/components/services/add-service-dialog";
import { AddCategoryDialog } from "@/components/services/add-category-dialog";
import { AddonsPageClient } from "@/components/services/addons-page-client";

export const dynamic = "force-dynamic";

export default async function AddonsPage() {
  const salon = await prisma.salon.findFirst();
  const currency = salon?.currency ?? "USD";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  const categories = await prisma.serviceCategory.findMany({
    include: {
      Service: {
        include: {
          StaffService: { include: { Staff: true } },
          AppointmentService: {
            include: { Appointment: { select: { date: true } } },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Flatten add-on services only
  const addons = categories.flatMap((cat) =>
    cat.Service.filter((s) => s.isAddon).map((s) => ({
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
      categoryName: cat.name,
      categoryIcon: cat.icon,
      staff: s.StaffService.map((ss) => ({
        id: ss.Staff.id,
        name: ss.Staff.name,
        avatar: ss.Staff.avatar,
      })),
    }))
  );

  const allCategoryStubs = categories.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
  }));

  return (
    <div className="p-4 md:p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Add-on Services</h1>
          <p className="text-muted-foreground mt-1">
            {addons.length} add-on{addons.length !== 1 ? "s" : ""} — combinable with primary
            services at booking
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <AddCategoryDialog />
          <AddServiceDialog categories={allCategoryStubs} defaultAddon />
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        <Link
          href="/dashboard/services"
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          <Scissors className="w-4 h-4" />
          Services
        </Link>
        <Link
          href="/dashboard/services?tab=analytics"
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
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
        <span className="px-4 py-2 text-sm font-semibold text-primary border-b-2 border-primary -mb-px flex items-center gap-1.5">
          <Layers className="w-4 h-4" />
          Add-ons
        </span>
      </div>

      {/* Content */}
      {addons.length === 0 ? (
        <div className="text-center py-24">
          <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">No add-on services yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create an add-on service by enabling the "Add-on service" toggle when adding a
            service.
          </p>
          <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
            <AddServiceDialog categories={allCategoryStubs} defaultAddon />
          </div>
        </div>
      ) : (
        <AddonsPageClient addons={addons} allCategories={allCategoryStubs} fmt={fmt} />
      )}
    </div>
  );
}
