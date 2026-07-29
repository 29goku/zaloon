import { prisma } from "@/lib/prisma";
import { DashboardShell } from "./dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [salon, pendingReminderCount] = await Promise.all([
    prisma.salon.findFirst({ select: { name: true, currency: true } }),
    prisma.reminder.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <DashboardShell salonName={salon?.name ?? "My Salon"} pendingReminderCount={pendingReminderCount}>
      {children}
    </DashboardShell>
  );
}
