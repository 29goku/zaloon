import { prisma } from "@/lib/prisma";
import { RetentionPageClient } from "./retention-page-client";

export const dynamic = "force-dynamic";

// ─── Types shared with client component ──────────────────────────────────────

export type CohortRow = {
  label: string;
  count: number;
  avgVisits: number;
  avgSpend: number;
  retentionRate: number; // % who returned (visits > 1)
  lastVisitBuckets: {
    recent: number;    // < 30 days
    moderate: number;  // 30-90 days
    distant: number;   // 90+ days
    none: number;      // no completed visits
  };
};

export type VisitFreqBucket = {
  label: string;
  count: number;
};

export type ValueTierCount = {
  champion: number;
  loyal: number;
  potential: number;
  newClients: number;
  atRisk: number;
  lost: number;
};

export type ClientRetentionSummary = {
  retentionRate: number;       // % with > 1 visit
  avgVisitFrequencyDays: number;
  atRiskCount: number;
  lostCount: number;
};

export type AtRiskClientRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  lastVisitDate: string;
  daysSince: number;
  totalVisits: number;
  avgSpend: number;
};

// ─── Page (Server Component) ──────────────────────────────────────────────────

export default async function RetentionPage() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const salon = await prisma.salon.findFirst({
    select: { id: true, name: true, slug: true },
  });

  if (!salon) {
    return (
      <div className="p-4 md:p-8 text-muted-foreground">No salon data found.</div>
    );
  }

  // Fetch all clients with their completed appointments
  const clients = await prisma.client.findMany({
    where: { salonId: salon.id },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      createdAt: true,
      Appointment: {
        where: { status: "COMPLETED" },
        orderBy: { date: "asc" },
        select: { date: true, totalAmount: true },
      },
    },
  });

  // Get clients with upcoming scheduled appointments
  const scheduledAppts = await prisma.appointment.findMany({
    where: {
      salonId: salon.id,
      status: "SCHEDULED",
      date: { gte: todayStr },
    },
    select: { clientId: true },
  });
  const scheduledClientIds = new Set(scheduledAppts.map((a) => a.clientId));

  // ─── Header stats ────────────────────────────────────────────────────────

  const clientsWithVisits = clients.filter((c) => c.Appointment.length > 0);
  const totalClients = clients.length;

  const retentionRate =
    totalClients > 0
      ? Math.round(
          (clientsWithVisits.filter((c) => c.Appointment.length > 1).length /
            totalClients) *
            100
        )
      : 0;

  // Average days between visits per client
  const allFrequencies: number[] = [];
  for (const c of clientsWithVisits) {
    if (c.Appointment.length < 2) continue;
    const dates = c.Appointment.map((a) => new Date(a.date + "T00:00:00").getTime());
    let totalGap = 0;
    for (let i = 1; i < dates.length; i++) {
      totalGap += (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
    }
    const avgGap = totalGap / (dates.length - 1);
    allFrequencies.push(avgGap);
  }
  const avgVisitFrequencyDays =
    allFrequencies.length > 0
      ? Math.round(
          allFrequencies.reduce((s, v) => s + v, 0) / allFrequencies.length
        )
      : 0;

  // At-risk: last visit 45-90 days ago, no upcoming appt
  let atRiskCount = 0;
  let lostCount = 0;
  const atRiskClients: AtRiskClientRow[] = [];
  const lostClients: AtRiskClientRow[] = [];

  for (const c of clientsWithVisits) {
    if (scheduledClientIds.has(c.id)) continue;
    const lastAppt = c.Appointment[c.Appointment.length - 1];
    const lastDate = new Date(lastAppt.date + "T00:00:00");
    const daysSince = Math.floor(
      (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalSpend = c.Appointment.reduce((s, a) => s + a.totalAmount, 0);
    const avgSpend = totalSpend / c.Appointment.length;

    if (daysSince >= 45 && daysSince <= 90) {
      atRiskCount++;
      atRiskClients.push({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        lastVisitDate: lastAppt.date,
        daysSince,
        totalVisits: c.Appointment.length,
        avgSpend,
      });
    } else if (daysSince > 90) {
      lostCount++;
      lostClients.push({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        lastVisitDate: lastAppt.date,
        daysSince,
        totalVisits: c.Appointment.length,
        avgSpend,
      });
    }
  }

  atRiskClients.sort((a, b) => a.daysSince - b.daysSince);
  lostClients.sort((a, b) => a.daysSince - b.daysSince);

  const summary: ClientRetentionSummary = {
    retentionRate,
    avgVisitFrequencyDays,
    atRiskCount,
    lostCount,
  };

  // ─── Cohort table ────────────────────────────────────────────────────────

  type CohortDef = { label: string; minDays: number; maxDays: number };
  const cohortDefs: CohortDef[] = [
    { label: "New (0-30 days)", minDays: 0, maxDays: 30 },
    { label: "Recent (31-90 days)", minDays: 31, maxDays: 90 },
    { label: "Established (91-180 days)", minDays: 91, maxDays: 180 },
    { label: "Loyal (181-365 days)", minDays: 181, maxDays: 365 },
    { label: "Long-term (365+ days)", minDays: 366, maxDays: Infinity },
  ];

  const cohorts: CohortRow[] = cohortDefs.map(({ label, minDays, maxDays }) => {
    const group = clients.filter((c) => {
      const firstApptDate = c.Appointment.length > 0
        ? new Date(c.Appointment[0].date + "T00:00:00")
        : c.createdAt;
      const daysAgo = Math.floor(
        (now.getTime() - firstApptDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysAgo >= minDays && daysAgo <= maxDays;
    });

    const count = group.length;
    if (count === 0) {
      return {
        label,
        count: 0,
        avgVisits: 0,
        avgSpend: 0,
        retentionRate: 0,
        lastVisitBuckets: { recent: 0, moderate: 0, distant: 0, none: 0 },
      };
    }

    const totalVisits = group.reduce((s, c) => s + c.Appointment.length, 0);
    const totalSpend = group.reduce(
      (s, c) => s + c.Appointment.reduce((ss, a) => ss + a.totalAmount, 0),
      0
    );
    const returnedCount = group.filter((c) => c.Appointment.length > 1).length;

    const buckets = { recent: 0, moderate: 0, distant: 0, none: 0 };
    for (const c of group) {
      if (c.Appointment.length === 0) {
        buckets.none++;
      } else {
        const lastAppt = c.Appointment[c.Appointment.length - 1];
        const lastDate = new Date(lastAppt.date + "T00:00:00");
        const days = Math.floor(
          (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (days < 30) buckets.recent++;
        else if (days <= 90) buckets.moderate++;
        else buckets.distant++;
      }
    }

    return {
      label,
      count,
      avgVisits: Math.round((totalVisits / count) * 10) / 10,
      avgSpend: Math.round(totalSpend / count),
      retentionRate: Math.round((returnedCount / count) * 100),
      lastVisitBuckets: buckets,
    };
  });

  // ─── Visit frequency chart ───────────────────────────────────────────────

  const freqBuckets: VisitFreqBucket[] = [
    { label: "0-14 days", count: 0 },
    { label: "15-30 days", count: 0 },
    { label: "31-60 days", count: 0 },
    { label: "61-90 days", count: 0 },
    { label: "90+ days", count: 0 },
  ];

  for (const freq of allFrequencies) {
    if (freq <= 14) freqBuckets[0].count++;
    else if (freq <= 30) freqBuckets[1].count++;
    else if (freq <= 60) freqBuckets[2].count++;
    else if (freq <= 90) freqBuckets[3].count++;
    else freqBuckets[4].count++;
  }

  // ─── Client value tiers ──────────────────────────────────────────────────

  const valueTiers: ValueTierCount = {
    champion: 0,
    loyal: 0,
    potential: 0,
    newClients: 0,
    atRisk: 0,
    lost: 0,
  };

  for (const c of clients) {
    const visits = c.Appointment.length;
    const lastAppt = c.Appointment.length > 0
      ? c.Appointment[c.Appointment.length - 1]
      : null;
    const daysSince = lastAppt
      ? Math.floor(
          (now.getTime() - new Date(lastAppt.date + "T00:00:00").getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : Infinity;
    const hasScheduled = scheduledClientIds.has(c.id);

    // At-risk and lost override other tiers
    if (!hasScheduled && daysSince >= 90) {
      valueTiers.lost++;
    } else if (!hasScheduled && daysSince >= 45) {
      valueTiers.atRisk++;
    } else if (visits >= 10 && daysSince < 60) {
      valueTiers.champion++;
    } else if (visits >= 5 && daysSince < 90) {
      valueTiers.loyal++;
    } else if (visits >= 2) {
      valueTiers.potential++;
    } else {
      valueTiers.newClients++;
    }
  }

  return (
    <RetentionPageClient
      summary={summary}
      cohorts={cohorts}
      visitFreqBuckets={freqBuckets}
      valueTiers={valueTiers}
      atRiskClients={atRiskClients}
      lostClients={lostClients}
      salonName={salon.name}
    />
  );
}
