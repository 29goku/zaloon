import { prisma } from "@/lib/prisma";
import { DashboardShell } from "./dashboard-shell";
import { getBranches } from "@/app/actions/branches";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [salons, pendingReminderCount, branches] = await Promise.all([
    prisma.salon.findMany({
      select: { id: true, name: true, currency: true, city: true, slug: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.reminder.count({ where: { status: "PENDING" } }),
    getBranches(),
  ]);

  const primarySalon = salons[0];

  return (
    <DashboardShell
      salonName={primarySalon?.name ?? "My Salon"}
      salonLocations={salons.map((s) => ({
        id: s.id,
        name: s.name,
        city: s.city,
        slug: s.slug,
      }))}
      pendingReminderCount={pendingReminderCount}
      branches={branches}
    >
      {children}
    </DashboardShell>
  );
}
