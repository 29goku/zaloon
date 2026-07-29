import { prisma } from "@/lib/prisma";
import { DashboardHome } from "./dashboard-home";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const today = new Date().toISOString().split("T")[0];

  const [salon, todayAppts, totalClients, totalStaff, recentInvoices] =
    await Promise.all([
      prisma.salon.findFirst(),
      prisma.appointment.count({
        where: { date: today, status: { not: "CANCELLED" } },
      }),
      prisma.client.count(),
      prisma.staff.count(),
      prisma.invoice.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { client: true },
      }),
    ]);

  const todayApptsList = await prisma.appointment.findMany({
    where: { date: today },
    orderBy: { startTime: "asc" },
    take: 8,
    include: {
      client: true,
      staff: true,
      services: { include: { service: true } },
    },
  });

  const revenue = recentInvoices.reduce((sum, inv) => sum + inv.total, 0);

  return (
    <DashboardHome
      salonName={salon?.name ?? "Your Salon"}
      currency={salon?.currency ?? "USD"}
      todayAppts={todayAppts}
      totalClients={totalClients}
      totalStaff={totalStaff}
      revenue={revenue}
      todayApptsList={todayApptsList}
    />
  );
}
