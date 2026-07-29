import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-primary/20 text-primary",
  VOID: "bg-[#F41666]/20 text-[#F41666]",
  PENDING: "bg-[#F48E16]/20 text-[#F48E16]",
};

export default async function InvoicesPage() {
  const salon = await prisma.salon.findFirst();

  const currency = salon?.currency ?? "USD";
  const invoicePrefix = salon?.invoicePrefix ?? "INV";

  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  // Fetch invoices oldest-first so we can assign ascending invoice numbers
  const invoicesAsc = await prisma.invoice.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      Client: true,
      Appointment: {
        include: {
          AppointmentService: {
            include: { Service: true },
          },
        },
      },
    },
  });

  // Build a map of id -> invoice number (1-based, padded to 4 digits)
  const invoiceNumberMap = new Map<string, string>(
    invoicesAsc.map((inv, idx) => [
      inv.id,
      `${invoicePrefix}-${String(idx + 1).padStart(4, "0")}`,
    ])
  );

  // Display newest-first
  const invoices = [...invoicesAsc].reverse();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
        <p className="text-muted-foreground mt-1">All payment records</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            {invoices.length} Invoice{invoices.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-8 h-8" />}
              title="No invoices yet"
              description="Invoices are created automatically when you complete and check out an appointment."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Invoice #
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Client
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Date
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Services
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Total
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Method
                    </th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const serviceNames =
                      inv.Appointment?.AppointmentService
                        .map((s) => s.Service.name)
                        .join(", ") ?? "—";
                    const invoiceNum = invoiceNumberMap.get(inv.id) ?? `${invoicePrefix}-????`;
                    const statusClass =
                      STATUS_STYLES[inv.status] ??
                      "bg-secondary text-muted-foreground";

                    return (
                      <tr
                        key={inv.id}
                        className="border-b border-border/50 hover:bg-secondary/40 transition-colors"
                      >
                        <td className="py-3 pr-4">
                          <Link
                            href={`/dashboard/invoices/${inv.id}`}
                            className="font-mono text-primary hover:underline"
                          >
                            {invoiceNum}
                          </Link>
                        </td>
                        <td className="py-3 pr-4 text-foreground font-medium">
                          {inv.Client?.name ?? (
                            <span className="text-muted-foreground">Walk-in</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                          {new Date(inv.createdAt).toLocaleDateString("en", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground max-w-[200px] truncate">
                          {serviceNames}
                        </td>
                        <td className="py-3 pr-4 font-semibold text-foreground">
                          {fmt(inv.total)}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground capitalize">
                          {inv.paymentMethod}
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusClass}`}
                          >
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
