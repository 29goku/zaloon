import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, Calendar, DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const salon = await prisma.salon.findFirst();
  const currency = salon?.currency ?? "USD";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  const [totalInvoices, totalClients, totalAppts, allInvoices] = await Promise.all([
    prisma.invoice.aggregate({ _sum: { total: true }, _count: true }),
    prisma.client.count(),
    prisma.appointment.count(),
    prisma.invoice.findMany({
      orderBy: { createdAt: "asc" },
      select: { total: true, createdAt: true },
    }),
  ]);

  const total = totalInvoices._sum.total ?? 0;
  const avg = totalInvoices._count > 0 ? total / totalInvoices._count : 0;

  const byMethod = await prisma.invoice.groupBy({
    by: ["paymentMethod"],
    _count: true,
    _sum: { total: true },
  });

  const stats = [
    {
      title: "Total Revenue",
      value: fmt(total),
      icon: DollarSign,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Total Clients",
      value: totalClients,
      icon: Users,
      color: "text-[#F48E16]",
      bg: "bg-[#F48E16]/10",
    },
    {
      title: "Total Appointments",
      value: totalAppts,
      icon: Calendar,
      color: "text-[#F41666]",
      bg: "bg-[#F41666]/10",
    },
    {
      title: "Avg. Invoice",
      value: fmt(avg),
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-1">Business overview & analytics</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.title} className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">{s.title}</p>
                <div className={`${s.bg} p-2 rounded-lg`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {byMethod.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Revenue by Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {byMethod.map((m) => {
                const pct = total > 0 ? ((m._sum.total ?? 0) / total) * 100 : 0;
                return (
                  <div key={m.paymentMethod}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground font-medium">{m.paymentMethod}</span>
                      <span className="text-muted-foreground">
                        {fmt(m._sum.total ?? 0)} · {m._count} invoices
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
