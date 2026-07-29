import { prisma } from "@/lib/prisma";
import { AtRiskPageClient } from "./at-risk-page-client";

export const dynamic = "force-dynamic";

// ─── Types shared with client component ──────────────────────────────────────

export type AtRiskClientRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  lastVisitDate: string;
  daysSince: number;
  totalVisits: number;
  totalSpend: number;
};

export type RecoveredClientRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  returnedDate: string;
  totalVisits: number;
  totalSpend: number;
};

// ─── Page (Server Component) ──────────────────────────────────────────────────

export default async function AtRiskPage() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const salon = await prisma.salon.findFirst({
    select: { id: true, name: true, slug: true },
  });

  if (!salon) {
    return (
      <div className="p-8 text-muted-foreground">No salon data found.</div>
    );
  }

  // First day of current month (ISO string)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);

  // Fetch all clients with their completed appointments (ordered asc for iteration)
  const clients = await prisma.client.findMany({
    where: { salonId: salon.id },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      Appointment: {
        where: { status: "COMPLETED" },
        orderBy: { date: "asc" },
        select: { date: true, totalAmount: true },
      },
    },
  });

  // Clients with upcoming scheduled appointments (exclude from at-risk/lost)
  const scheduledAppts = await prisma.appointment.findMany({
    where: {
      salonId: salon.id,
      status: "SCHEDULED",
      date: { gte: todayStr },
    },
    select: { clientId: true },
  });
  const scheduledClientIds = new Set(
    scheduledAppts.map((a) => a.clientId).filter(Boolean) as string[]
  );

  // ─── Classify clients ──────────────────────────────────────────────────────

  const atRiskClients: AtRiskClientRow[] = [];
  const lostClients: AtRiskClientRow[] = [];
  const recoveredClients: RecoveredClientRow[] = [];

  for (const c of clients) {
    if (c.Appointment.length === 0) continue;

    const completedAppts = c.Appointment; // already ordered asc
    const lastAppt = completedAppts[completedAppts.length - 1];
    const lastDate = new Date(lastAppt.date + "T00:00:00");
    const daysSince = Math.floor(
      (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalSpend = completedAppts.reduce((s, a) => s + a.totalAmount, 0);

    // ── Recovered: client who had a gap > 90 days before their most recent
    //    completed visit, and that most recent visit happened this month.
    if (completedAppts.length >= 2) {
      const secondLast = completedAppts[completedAppts.length - 2];
      const gapDays = Math.floor(
        (lastDate.getTime() -
          new Date(secondLast.date + "T00:00:00").getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (gapDays > 90 && lastAppt.date >= monthStartStr) {
        recoveredClients.push({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          returnedDate: lastAppt.date,
          totalVisits: completedAppts.length,
          totalSpend,
        });
        // Recovered clients should not also appear in at-risk/lost
        continue;
      }
    }

    // Skip clients with upcoming scheduled appointments for at-risk/lost
    if (scheduledClientIds.has(c.id)) continue;

    if (daysSince >= 45 && daysSince <= 90) {
      atRiskClients.push({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        lastVisitDate: lastAppt.date,
        daysSince,
        totalVisits: completedAppts.length,
        totalSpend,
      });
    } else if (daysSince > 90) {
      lostClients.push({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        lastVisitDate: lastAppt.date,
        daysSince,
        totalVisits: completedAppts.length,
        totalSpend,
      });
    }
  }

  // Sort at-risk by days ascending (closest to tipping point first)
  atRiskClients.sort((a, b) => a.daysSince - b.daysSince);
  // Sort lost by days ascending (most recent first)
  lostClients.sort((a, b) => a.daysSince - b.daysSince);
  // Sort recovered by return date descending (most recent first)
  recoveredClients.sort((a, b) => b.returnedDate.localeCompare(a.returnedDate));

  // ─── Recovery rate ─────────────────────────────────────────────────────────
  // % of at-risk clients (from last month) who came back this month
  const atRiskCount = atRiskClients.length;
  const lostCount = lostClients.length;
  const recoveredThisMonth = recoveredClients.length;

  // Recovery rate: recovered / (recovered + atRisk) expressed as %
  const denominator = recoveredThisMonth + atRiskCount;
  const recoveryRate =
    denominator > 0 ? Math.round((recoveredThisMonth / denominator) * 100) : 0;

  return (
    <AtRiskPageClient
      atRiskClients={atRiskClients}
      lostClients={lostClients}
      recoveredClients={recoveredClients}
      atRiskCount={atRiskCount}
      lostCount={lostCount}
      recoveryRate={recoveryRate}
      recoveredThisMonth={recoveredThisMonth}
    />
  );
}
