import { prisma } from "@/lib/prisma";
import { DashboardShell } from "./dashboard-shell";
import { getBranches } from "@/app/actions/branches";
import { getFeatures } from "@/lib/feature-flags";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/auth/login");
  }

  const [salons, pendingReminderCount, branches, features] = await Promise.all([
    prisma.salon.findMany({
      select: { id: true, name: true, currency: true, city: true, slug: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.reminder.count({ where: { status: "PENDING" } }),
    getBranches(),
    getFeatures(),
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
      features={features}
    >
      {children}
    </DashboardShell>
  );
}
