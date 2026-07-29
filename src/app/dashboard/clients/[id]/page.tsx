import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LoyaltyBadge, getLoyaltyTier } from "@/components/clients/loyalty-badge";
import {
  ArrowLeft,
  Phone,
  Mail,
  Cake,
  Heart,
  StickyNote,
  TrendingUp,
  Wallet,
  CalendarDays,
  Star,
} from "lucide-react";

export const dynamic = "force-dynamic";

const statusColor: Record<string, string> = {
  SCHEDULED: "bg-[#F48E16]/20 text-[#F48E16] border-0",
  COMPLETED: "bg-primary/20 text-primary border-0",
  CANCELLED: "bg-[#F41666]/20 text-[#F41666] border-0",
  NO_SHOW: "bg-muted text-muted-foreground border-0",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [client, salon] = await Promise.all([
    prisma.client.findUnique({
      where: { id },
      include: {
        Appointment: {
          orderBy: { date: "desc" },
          include: {
            Staff: true,
            AppointmentService: { include: { Service: true } },
            Invoice: true,
          },
        },
        LedgerEntry: {
          orderBy: { createdAt: "desc" },
        },
        Invoice: {
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.salon.findFirst(),
  ]);

  if (!client) notFound();

  const currency = salon?.currency ?? "USD";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  // --- Stats ---
  const totalVisits = client.Appointment.length;
  const totalSpend = client.Appointment.reduce(
    (sum, a) => sum + a.totalAmount,
    0
  );

  // --- Net ledger balance ---
  const ledgerBalance = client.LedgerEntry.reduce((sum, entry) => {
    return entry.type === "CREDIT" ? sum + entry.amount : sum - entry.amount;
  }, 0);

  // --- Top services ---
  const serviceCount: Record<string, { name: string; count: number }> = {};
  for (const appt of client.Appointment) {
    for (const as of appt.AppointmentService) {
      const sid = as.Service.id;
      if (!serviceCount[sid]) {
        serviceCount[sid] = { name: as.Service.name, count: 0 };
      }
      serviceCount[sid].count++;
    }
  }
  const topServices = Object.values(serviceCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // --- Next visit prediction ---
  let nextVisitPrediction: string | null = null;
  const completedAppts = client.Appointment
    .filter((a) => a.status === "COMPLETED")
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  if (completedAppts.length >= 3) {
    const dates = completedAppts.map((a) => new Date(a.date).getTime());
    let totalGap = 0;
    for (let i = 1; i < dates.length; i++) {
      totalGap += dates[i] - dates[i - 1];
    }
    const avgGapMs = totalGap / (dates.length - 1);
    const lastDate = dates[dates.length - 1];
    const predictedDate = new Date(lastDate + avgGapMs);
    nextVisitPrediction = predictedDate.toLocaleDateString("en", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="p-8">
      {/* Back button */}
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Clients
      </Link>

      <div className="flex gap-8 items-start">
        {/* Left column — client info card */}
        <aside className="w-72 flex-shrink-0 space-y-4">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              {/* Avatar + name */}
              <div className="flex flex-col items-center text-center gap-3 mb-6">
                <div className="w-16 h-16 rounded-full bg-[#F48E16]/20 flex items-center justify-center text-[#F48E16] text-2xl font-bold">
                  {client.name[0].toUpperCase()}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    {client.name}
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Client since{" "}
                    {new Date(client.createdAt).toLocaleDateString("en", {
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-2 mb-6">
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    {client.phone}
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.birthday && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Cake className="w-4 h-4 flex-shrink-0" />
                    {new Date(client.birthday).toLocaleDateString("en", {
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                )}
                {client.anniversary && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Heart className="w-4 h-4 flex-shrink-0" />
                    Anniversary:{" "}
                    {new Date(client.anniversary).toLocaleDateString("en", {
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-foreground">
                    {totalVisits}
                  </p>
                  <p className="text-xs text-muted-foreground">Visits</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-foreground">
                    {fmt(totalSpend)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total spend</p>
                </div>
              </div>

              {/* Loyalty */}
              <div className="pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Loyalty
                </p>
                <LoyaltyBadge points={client.loyaltyPoints} variant="full" className="w-full" />
              </div>
            </CardContent>
          </Card>

          {/* Next visit prediction */}
          {nextVisitPrediction && (
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <CalendarDays className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">
                      Next visit predicted
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Around {nextVisitPrediction}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top services */}
          {topServices.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#F48E16]" />
                  Top Services
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-2">
                  {topServices.map((svc, i) => (
                    <div
                      key={svc.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm text-foreground truncate">
                          {svc.name}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        ×{svc.count}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </aside>

        {/* Right column — tabs */}
        <div className="flex-1 min-w-0">
          <Tabs defaultValue="visits">
            <TabsList className="mb-6">
              <TabsTrigger value="visits">Visits</TabsTrigger>
              <TabsTrigger value="ledger">Ledger</TabsTrigger>
              <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            {/* Visits tab */}
            <TabsContent value="visits">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {totalVisits} visit{totalVisits !== 1 ? "s" : ""} &middot;{" "}
                  {fmt(totalSpend)} total spend
                </p>
              </div>

              {client.Appointment.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  No visits yet
                </div>
              ) : (
                <div className="space-y-3">
                  {client.Appointment.map((appt) => (
                    <div
                      key={appt.id}
                      className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                    >
                      {/* Date column */}
                      <div className="min-w-[72px] text-center flex-shrink-0">
                        <p className="text-sm font-bold text-foreground">
                          {new Date(appt.date).toLocaleDateString("en", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(appt.date).getFullYear()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {appt.startTime}
                        </p>
                      </div>

                      <div className="w-px self-stretch bg-border flex-shrink-0" />

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {appt.AppointmentService.length > 0
                            ? appt.AppointmentService
                                .map((s) => s.Service.name)
                                .join(", ")
                            : "No services"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          with {appt.Staff.name}
                        </p>
                      </div>

                      {/* Amount + status */}
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <p className="text-sm font-bold text-foreground">
                          {fmt(appt.totalAmount)}
                        </p>
                        <Badge
                          className={
                            statusColor[appt.status] ??
                            "bg-muted text-muted-foreground border-0"
                          }
                        >
                          {appt.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Ledger tab */}
            <TabsContent value="ledger">
              {/* Balance */}
              <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-card border border-border">
                <Wallet className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                    Net Balance
                  </p>
                  <p
                    className={`text-xl font-bold ${
                      ledgerBalance >= 0
                        ? "text-primary"
                        : "text-[#F41666]"
                    }`}
                  >
                    {ledgerBalance >= 0 ? "+" : ""}
                    {fmt(ledgerBalance)}
                  </p>
                </div>
              </div>

              {client.LedgerEntry.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Wallet className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  No ledger entries
                </div>
              ) : (
                <div className="space-y-2">
                  {client.LedgerEntry.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border"
                    >
                      {/* Credit/Debit indicator */}
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          entry.type === "CREDIT"
                            ? "bg-primary"
                            : "bg-[#F41666]"
                        }`}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              entry.type === "CREDIT"
                                ? "bg-primary/20 text-primary border-0"
                                : "bg-[#F41666]/20 text-[#F41666] border-0"
                            }
                          >
                            {entry.type}
                          </Badge>
                          {entry.note && (
                            <p className="text-sm text-muted-foreground truncate">
                              {entry.note}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(entry.createdAt).toLocaleDateString("en", {
                            dateStyle: "medium",
                          })}
                        </p>
                      </div>

                      <p
                        className={`text-sm font-bold flex-shrink-0 ${
                          entry.type === "CREDIT"
                            ? "text-primary"
                            : "text-[#F41666]"
                        }`}
                      >
                        {entry.type === "CREDIT" ? "+" : "-"}
                        {fmt(entry.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Loyalty tab */}
            <TabsContent value="loyalty">
              {(() => {
                const tier = getLoyaltyTier(client.loyaltyPoints);
                const tierBenefits: Record<string, string[]> = {
                  Bronze: [
                    "Earn 1 point per ₹10 / $10 spent",
                    "Birthday discount: 5% off",
                  ],
                  Silver: [
                    "Earn 1 point per ₹10 / $10 spent",
                    "Birthday discount: 10% off",
                    "Priority booking",
                  ],
                  Gold: [
                    "Earn 1 point per ₹10 / $10 spent",
                    "Birthday discount: 15% off",
                    "Priority booking",
                    "Free add-on service (monthly)",
                  ],
                  Platinum: [
                    "Earn 1 point per ₹10 / $10 spent",
                    "Birthday discount: 20% off",
                    "Priority booking",
                    "Free add-on service (monthly)",
                    "VIP lounge access",
                    "Dedicated stylist",
                  ],
                };

                // Filter ledger for points entries
                const pointsLedger = client.LedgerEntry.filter((e) =>
                  e.note?.includes("Points")
                );

                return (
                  <div className="space-y-6">
                    {/* Current points card */}
                    <div className="flex items-center gap-4 p-5 rounded-xl bg-card border border-border">
                      <LoyaltyBadge points={client.loyaltyPoints} variant="full" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {client.loyaltyPoints} loyalty points
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {tier} tier member
                        </p>
                        {tier !== "Platinum" && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {tier === "Bronze" && `${100 - client.loyaltyPoints} pts to Silver`}
                            {tier === "Silver" && `${500 - client.loyaltyPoints} pts to Gold`}
                            {tier === "Gold" && `${1000 - client.loyaltyPoints} pts to Platinum`}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Tier benefits */}
                    <Card className="bg-card border-border">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Star className="w-4 h-4 text-[#F48E16]" />
                          {tier} Tier Benefits
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <ul className="space-y-1.5">
                          {tierBenefits[tier].map((benefit) => (
                            <li key={benefit} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className="text-primary mt-0.5">•</span>
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    {/* Points history */}
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-3">Points History</p>
                      {pointsLedger.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                          <Star className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <p className="text-sm">No points activity yet</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {pointsLedger.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex items-center gap-4 p-3 rounded-xl bg-card border border-border"
                            >
                              <div
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  entry.type === "CREDIT" ? "bg-primary" : "bg-[#F41666]"
                                }`}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-muted-foreground truncate">
                                  {entry.note}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {new Date(entry.createdAt).toLocaleDateString("en", {
                                    dateStyle: "medium",
                                  })}
                                </p>
                              </div>
                              <p
                                className={`text-sm font-bold flex-shrink-0 ${
                                  entry.type === "CREDIT" ? "text-primary" : "text-[#F41666]"
                                }`}
                              >
                                {entry.type === "CREDIT" ? "+" : "-"}
                                {Math.round(entry.amount)} pts
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </TabsContent>

            {/* Notes tab */}
            <TabsContent value="notes">
              <div className="p-6 rounded-xl bg-card border border-border">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <StickyNote className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">
                      Client Notes
                    </h3>
                  </div>
                  <Link
                    href="/dashboard/clients"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors"
                  >
                    Edit
                  </Link>
                </div>

                {client.notes ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {client.notes}
                  </p>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <StickyNote className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No notes for this client</p>
                  </div>
                )}
              </div>

              {/* Trend insight */}
              {totalVisits > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-card border border-border flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-[#F48E16] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Visit summary
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {totalVisits} total visit{totalVisits !== 1 ? "s" : ""},
                      averaging {fmt(totalSpend / totalVisits)} per visit.
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
