import { prisma } from "@/lib/prisma";

export interface DigestData {
  period: { start: string; end: string };
  revenue: {
    total: number;
    vsLastPeriod: number | null; // % change, null if no prior data
    byDay: { date: string; amount: number }[];
  };
  appointments: {
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
  };
  newClients: {
    count: number;
    names: string[];
  };
  topStaff: {
    name: string;
    revenue: number;
    appointments: number;
  }[];
  avgRating: number | null;
  recentReviews: {
    rating: number;
    comment: string | null;
    clientName: string | null;
  }[];
}

export async function generateDigestData(
  salonId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<DigestData> {
  const periodLengthMs = periodEnd.getTime() - periodStart.getTime();
  const prevStart = new Date(periodStart.getTime() - periodLengthMs);
  const prevEnd = periodStart;

  // Convert date boundaries to ISO strings for string-based date comparisons
  const startStr = periodStart.toISOString().slice(0, 10); // YYYY-MM-DD
  const endStr = periodEnd.toISOString().slice(0, 10);

  const [
    invoices,
    prevInvoices,
    appointments,
    newClients,
    reviews,
  ] = await Promise.all([
    // Revenue invoices in period
    prisma.invoice.findMany({
      where: {
        salonId,
        status: "PAID",
        createdAt: { gte: periodStart, lt: periodEnd },
      },
      select: { total: true, createdAt: true },
    }),
    // Previous period invoices for comparison
    prisma.invoice.findMany({
      where: {
        salonId,
        status: "PAID",
        createdAt: { gte: prevStart, lt: prevEnd },
      },
      select: { total: true },
    }),
    // Appointments in period
    prisma.appointment.findMany({
      where: {
        salonId,
        date: { gte: startStr, lte: endStr },
      },
      include: {
        Staff: { select: { id: true, name: true } },
      },
    }),
    // New clients created in period
    prisma.client.findMany({
      where: {
        salonId,
        createdAt: { gte: periodStart, lt: periodEnd },
      },
      select: { name: true },
    }),
    // Recent reviews in period
    prisma.review.findMany({
      where: {
        salonId,
        createdAt: { gte: periodStart, lt: periodEnd },
      },
      include: { Client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // ── Revenue ───────────────────────────────────────────────────────────────
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const prevRevenue = prevInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const vsLastPeriod =
    prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : null;

  // Group by day
  const revenueByDayMap: Record<string, number> = {};
  for (const inv of invoices) {
    const day = inv.createdAt.toISOString().slice(0, 10);
    revenueByDayMap[day] = (revenueByDayMap[day] ?? 0) + inv.total;
  }
  const byDay = Object.entries(revenueByDayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }));

  // ── Appointments ─────────────────────────────────────────────────────────
  const total = appointments.length;
  const completed = appointments.filter((a) => a.status === "COMPLETED").length;
  const cancelled = appointments.filter((a) => a.status === "CANCELLED").length;
  const noShow = appointments.filter((a) => a.status === "NO_SHOW").length;

  // ── Top Staff ─────────────────────────────────────────────────────────────
  // Use invoice data linked to appointments with a staff
  const staffStats: Record<string, { name: string; revenue: number; appointments: number }> = {};
  for (const appt of appointments) {
    const staffId = appt.staffId;
    const staffName = appt.Staff?.name ?? "Unknown";
    if (!staffStats[staffId]) {
      staffStats[staffId] = { name: staffName, revenue: 0, appointments: 0 };
    }
    staffStats[staffId].appointments += 1;
    staffStats[staffId].revenue += appt.totalAmount ?? 0;
  }
  const topStaff = Object.values(staffStats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((s) => ({ ...s, revenue: Math.round(s.revenue * 100) / 100 }));

  // ── Reviews ───────────────────────────────────────────────────────────────
  const avgRating =
    reviews.length > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
      : null;

  const recentReviews = reviews.map((r) => ({
    rating: r.rating,
    comment: r.comment ?? null,
    clientName: r.Client?.name ?? null,
  }));

  return {
    period: { start: periodStart.toISOString(), end: periodEnd.toISOString() },
    revenue: {
      total: Math.round(totalRevenue * 100) / 100,
      vsLastPeriod,
      byDay,
    },
    appointments: { total, completed, cancelled, noShow },
    newClients: {
      count: newClients.length,
      names: newClients.map((c) => c.name),
    },
    topStaff,
    avgRating,
    recentReviews,
  };
}
