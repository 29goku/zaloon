import { prisma } from "@/lib/prisma";
import { Activity } from "lucide-react";
import { BreakevenCalculator } from "./breakeven-client";

export const dynamic = "force-dynamic";

export default async function BreakevenPage() {
  const salon = await prisma.salon.findFirst({
    select: { id: true, currency: true },
  });
  const currency = salon?.currency ?? "USD";
  const salonId = salon?.id ?? "";

  // Fetch average appointment value from DB
  const invoiceAgg = await prisma.invoice.aggregate({
    where: { salonId, status: "PAID" },
    _avg: { total: true },
    _count: { id: true },
  });

  const avgApptValue = Math.round(invoiceAgg._avg.total ?? 0);
  const totalInvoices = invoiceAgg._count.id;

  // Fetch staff count
  const staffCount = await prisma.staff.count({ where: { salonId } });

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Activity className="w-7 h-7 text-primary" />
          Break-Even Calculator
        </h1>
        <p className="text-muted-foreground mt-1">
          Find out how many appointments you need each month to cover costs and turn a profit
        </p>
      </div>

      <BreakevenCalculator
        currency={currency}
        defaultAvgValue={avgApptValue}
        defaultStaffCount={staffCount}
        totalInvoices={totalInvoices}
      />
    </div>
  );
}
