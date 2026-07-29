import { prisma } from "@/lib/prisma";
import { Users, UserPlus, Wand2 } from "lucide-react";
import Link from "next/link";
import { AddStaffDialog } from "@/components/staff/add-staff-dialog";
import { StaffListEnhanced } from "@/components/staff/staff-list-enhanced";
import { EmptyState } from "@/components/ui/empty-state";
import { StaffOfMonth } from "@/components/staff/staff-of-month";

export const dynamic = "force-dynamic";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default async function StaffPage() {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];
  const monthLabel = today.toLocaleString("en", {
    month: "long",
    year: "numeric",
  });

  const salon = await prisma.salon.findFirst({
    select: { id: true, currency: true },
  });
  const currency = salon?.currency ?? "USD";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  const [staff, services, monthAppts] = await Promise.all([
    prisma.staff.findMany({
      include: {
        Shift: true,
        StaffService: { include: { Service: true } },
        _count: { select: { Appointment: true } },
        Appointment: {
          where: { date: todayStr },
          select: { id: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.service.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        ...(salon ? { salonId: salon.id } : {}),
        status: "COMPLETED",
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { staffId: true, totalAmount: true },
    }),
  ]);

  // Find top earner this month
  const revenueByStaff: Record<string, { revenue: number; appointments: number }> = {};
  for (const a of monthAppts) {
    if (!revenueByStaff[a.staffId]) {
      revenueByStaff[a.staffId] = { revenue: 0, appointments: 0 };
    }
    revenueByStaff[a.staffId].revenue += a.totalAmount;
    revenueByStaff[a.staffId].appointments += 1;
  }

  const topStaff = staff
    .map((s) => ({
      ...s,
      monthRevenue: revenueByStaff[s.id]?.revenue ?? 0,
      monthAppointments: revenueByStaff[s.id]?.appointments ?? 0,
    }))
    .sort((a, b) => b.monthRevenue - a.monthRevenue)[0];

  return (
    <div className="p-4 md:p-8">
      {/* Staff of the Month widget */}
      {topStaff && topStaff.monthRevenue > 0 && (
        <StaffOfMonth
          name={topStaff.name}
          revenue={fmt(topStaff.monthRevenue)}
          appointments={topStaff.monthAppointments}
          initials={getInitials(topStaff.name)}
          month={monthLabel}
        />
      )}

      <div className="flex items-center justify-between mb-6 md:mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Staff</h1>
          <p className="text-muted-foreground mt-1">
            {staff.length} team member{staff.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/dashboard/staff/payroll"
            className="flex items-center gap-2 border border-border px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-accent transition-colors"
          >
            Payroll
          </Link>
          {/* Quick add dialog */}
          <div className="flex items-center gap-2">
            <AddStaffDialog />
            <span className="text-xs text-muted-foreground hidden sm:block">Quick add ↑</span>
          </div>
          {/* Full onboarding wizard */}
          <Link
            href="/dashboard/staff/new"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Wand2 className="w-4 h-4" />
            Full Onboarding →
          </Link>
        </div>
      </div>

      {staff.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No staff members yet"
          description="Add your first team member to start scheduling appointments and tracking performance."
          action={
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <AddStaffDialog />
              <Link
                href="/dashboard/staff/new"
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Full Onboarding
              </Link>
            </div>
          }
        />
      ) : (
        <StaffListEnhanced staff={staff} allServices={services} />
      )}
    </div>
  );
}
