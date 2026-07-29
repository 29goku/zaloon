import { Zap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { QuickPayContainer } from "@/components/quick-pay/quick-pay-container";

export const dynamic = "force-dynamic";

export interface RecentInvoice {
  id: string;
  total: number;
  paymentMethod: string;
  note: string | null;
  createdAt: string;
  clientName: string | null;
}

async function getRecentInvoices(): Promise<RecentInvoice[]> {
  const salon = await prisma.salon.findFirst();
  if (!salon) return [];

  const invoices = await prisma.invoice.findMany({
    where: { salonId: salon.id, appointmentId: null },
    include: { client: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return invoices.map((inv) => ({
    id: inv.id,
    total: inv.total,
    paymentMethod: inv.paymentMethod,
    note: inv.note,
    createdAt: inv.createdAt.toISOString(),
    clientName: inv.client?.name ?? null,
  }));
}

export default async function QuickPayPage() {
  const recentInvoices = await getRecentInvoices();

  return (
    <div className="p-8 max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Zap className="w-7 h-7 text-primary" />
          Quick Pay
        </h1>
        <p className="text-muted-foreground mt-1">Fast payment collection</p>
      </div>

      <QuickPayContainer initialInvoices={recentInvoices} />
    </div>
  );
}
