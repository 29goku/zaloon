import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ACHIEVEMENTS,
  calculateAchievements,
  calcPoints,
} from "@/lib/achievements";

export const dynamic = "force-dynamic";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-violet-500/20 text-violet-400",
  "bg-blue-500/20 text-blue-400",
  "bg-emerald-500/20 text-emerald-400",
  "bg-rose-500/20 text-rose-400",
  "bg-amber-500/20 text-amber-400",
  "bg-cyan-500/20 text-cyan-400",
  "bg-fuchsia-500/20 text-fuchsia-400",
  "bg-orange-500/20 text-orange-400",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default async function LeaderboardPage() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const salon = await prisma.salon.findFirst({
    select: { id: true, currency: true },
  });
  const currency = salon?.currency ?? "USD";
  const salonFilter = salon ? { salonId: salon.id } : {};

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  const [staffList, monthAppts, reviews] = await Promise.all([
    prisma.staff.findMany({
      where: salonFilter,
      orderBy: { name: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        ...salonFilter,
        status: "COMPLETED",
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { staffId: true, totalAmount: true },
    }),
    prisma.review.findMany({
      where: { ...salonFilter, staffId: { not: null } },
      select: { staffId: true, rating: true },
    }),
  ]);

  // Calculate achievements for each staff member
  const achievementsMap = await Promise.all(
    staffList.map(async (s) => {
      const result = await calculateAchievements(prisma, s.id);
      return { staffId: s.id, ...result };
    })
  );
  const achByStaff = Object.fromEntries(
    achievementsMap.map((a) => [a.staffId, a])
  );

  // Build per-staff stats
  const rows = staffList.map((s) => {
    const appts = monthAppts.filter((a) => a.staffId === s.id);
    const revenue = appts.reduce((sum, a) => sum + a.totalAmount, 0);
    const staffReviews = reviews.filter((r) => r.staffId === s.id);
    const avgRating =
      staffReviews.length > 0
        ? staffReviews.reduce((sum, r) => sum + r.rating, 0) /
          staffReviews.length
        : 0;
    const fiveStarReviews = staffReviews.filter((r) => r.rating === 5).length;
    const earned = achByStaff[s.id]?.earned ?? [];
    const points = calcPoints({
      appointments: appts.length,
      revenue,
      fiveStarReviews,
      earnedAchievements: earned,
    });

    return {
      id: s.id,
      name: s.name,
      revenue,
      appointments: appts.length,
      avgRating,
      earned,
      points,
    };
  });

  // Sort by revenue descending
  const sorted = [...rows].sort((a, b) => b.revenue - a.revenue);
  const topStaff = sorted[0];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard/staff/performance"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Performance
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-500" />
            Leaderboard
          </h1>
          <p className="text-muted-foreground mt-1">
            {today.toLocaleString("en", { month: "long" })}{" "}
            {today.getFullYear()} — ranked by revenue
          </p>
        </div>
      </div>

      {/* ── Leaderboard Table ─────────────────────────────────────────────── */}
      <Card className="bg-card border-border mb-10">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-5 py-3 font-semibold text-muted-foreground w-16">
                    Rank
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    Staff Member
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    Revenue
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    Appointments
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    Avg Rating
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    Achievements
                  </th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-16 text-muted-foreground"
                    >
                      No staff data for this month.
                    </td>
                  </tr>
                ) : (
                  sorted.map((row, idx) => {
                    const rank = idx + 1;
                    const medal = RANK_MEDALS[rank];
                    // First staff member gets highlighted (current user context)
                    const isYou = idx === 0;

                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-border last:border-0 transition-colors ${
                          isYou
                            ? "bg-primary/5 hover:bg-primary/10"
                            : "hover:bg-muted/30"
                        } ${idx % 2 !== 0 && !isYou ? "bg-muted/10" : ""}`}
                      >
                        {/* Rank */}
                        <td className="px-5 py-4">
                          <span
                            className={`text-base font-bold tabular-nums ${
                              rank === 1
                                ? "text-amber-400"
                                : rank === 2
                                ? "text-slate-400"
                                : rank === 3
                                ? "text-orange-500"
                                : "text-muted-foreground"
                            }`}
                          >
                            {medal ?? `#${rank}`}
                          </span>
                        </td>

                        {/* Staff */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor(row.name)}`}
                            >
                              {getInitials(row.name)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/dashboard/staff/${row.id}`}
                                  className="font-medium text-foreground hover:text-primary transition-colors"
                                >
                                  {row.name}
                                </Link>
                                {isYou && (
                                  <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-medium">
                                    You
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Revenue */}
                        <td className="px-4 py-4 text-right tabular-nums font-semibold text-primary">
                          {fmt(row.revenue)}
                        </td>

                        {/* Appointments */}
                        <td className="px-4 py-4 text-right tabular-nums font-medium text-foreground">
                          {row.appointments}
                        </td>

                        {/* Avg Rating */}
                        <td className="px-4 py-4 text-right">
                          {row.avgRating > 0 ? (
                            <span className="text-amber-400 font-semibold tabular-nums">
                              ★ {row.avgRating.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              —
                            </span>
                          )}
                        </td>

                        {/* Achievements */}
                        <td className="px-4 py-4 text-right">
                          {row.earned.length > 0 ? (
                            <span className="text-sm" title={row.earned.map((a) => a.name).join(", ")}>
                              {row.earned.slice(0, 4).map((a) => a.icon).join("")}
                              {row.earned.length > 4 && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  +{row.earned.length - 4}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              None yet
                            </span>
                          )}
                        </td>

                        {/* Points */}
                        <td className="px-5 py-4 text-right">
                          <span
                            className={`tabular-nums font-bold ${
                              rank === 1 ? "text-amber-400" : "text-foreground"
                            }`}
                          >
                            {row.points.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Points Legend ────────────────────────────────────────────────── */}
      <Card className="bg-card border-border mb-10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground">
            How points are calculated
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" />
              1 pt per appointment
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              10 pts per $100 revenue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              5 pts per 5-star review
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-700 inline-block" />
              25 pts for bronze badge
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
              50 pts for silver badge
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              100 pts for gold badge
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Achievement Cards Grid ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-5">
        <Trophy className="w-4 h-4 text-amber-500" />
        <h2 className="text-lg font-bold text-foreground">Staff Achievement Cards</h2>
        <span className="text-sm text-muted-foreground">badges earned vs locked</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {sorted.map((s) => {
          return (
            <Card key={s.id} className="bg-card border-border">
              <CardContent className="p-5">
                {/* Card header */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor(s.name)}`}
                  >
                    {getInitials(s.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {s.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.points.toLocaleString()} pts &middot;{" "}
                      {s.earned.length} badge{s.earned.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Badge grid */}
                <div className="grid grid-cols-4 gap-2">
                  {ACHIEVEMENTS.map((ach) => {
                    const isEarned = s.earned.some((e) => e.id === ach.id);
                    return (
                      <div
                        key={ach.id}
                        title={isEarned ? ach.name : `🔒 ${ach.name}`}
                        className={`aspect-square rounded-xl flex items-center justify-center text-xl transition-all ${
                          isEarned
                            ? "bg-muted/60"
                            : "bg-muted/20 opacity-30 grayscale"
                        }`}
                      >
                        {isEarned ? ach.icon : "🔒"}
                      </div>
                    );
                  })}
                </div>

                <Link
                  href={`/dashboard/staff/${s.id}`}
                  className="mt-4 text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                >
                  View profile &rarr;
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {topStaff && (
        <p className="text-xs text-muted-foreground text-center mt-8">
          Leaderboard resets monthly. Current leader:{" "}
          <span className="text-foreground font-medium">{topStaff.name}</span>{" "}
          with {fmt(topStaff.revenue)}.
        </p>
      )}
    </div>
  );
}
