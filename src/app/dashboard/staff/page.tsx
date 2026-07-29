import { prisma } from "@/lib/prisma";
import { Users } from "lucide-react";
import Link from "next/link";
import { AddStaffDialog } from "@/components/staff/add-staff-dialog";
import { StaffList } from "@/components/staff/staff-list";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const [staff, services] = await Promise.all([
    prisma.staff.findMany({
      include: {
        Shift: true,
        StaffService: { include: { Service: true } },
        _count: { select: { Appointment: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.service.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Staff</h1>
          <p className="text-muted-foreground mt-1">
            {staff.length} team member{staff.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/staff/payroll"
            className="flex items-center gap-2 border border-border px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-accent transition-colors"
          >
            Payroll
          </Link>
          <AddStaffDialog />
        </div>
      </div>

      {staff.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No staff members yet"
          description="Add your first team member to start scheduling appointments and tracking performance."
          action={<AddStaffDialog />}
        />
      ) : (
        <StaffList staff={staff} allServices={services} />
      )}
    </div>
  );
}
