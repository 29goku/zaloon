import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { StaffOnboardingWizard } from "@/components/staff/staff-onboarding-wizard";

export const dynamic = "force-dynamic";

export default async function NewStaffPage() {
  const [services, existingStaff] = await Promise.all([
    prisma.service.findMany({
      where: { active: true },
      include: { ServiceCategory: true },
      orderBy: [{ ServiceCategory: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.staff.findMany({
      include: { StaffService: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const servicesData = services.map((s) => ({
    id: s.id,
    name: s.name,
    price: s.price,
    categoryId: s.categoryId,
    categoryName: s.ServiceCategory.name,
  }));

  const existingStaffData = existingStaff.map((s) => ({
    id: s.id,
    name: s.name,
    services: s.StaffService.map((ss) => ss.serviceId),
  }));

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Back navigation */}
        <Link
          href="/dashboard/staff"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Staff
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Add New Staff Member</h1>
          <p className="text-muted-foreground mt-1">
            Set up their profile, schedule, and services in a few steps.
          </p>
        </div>

        <StaffOnboardingWizard
          services={servicesData}
          existingStaff={existingStaffData}
        />
      </div>
    </div>
  );
}
