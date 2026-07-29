import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [invoice, salon] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
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
    }),
    prisma.salon.findFirst(),
  ]);

  if (!invoice) notFound();

  const currency = salon?.currency ?? "USD";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(n);

  const services = invoice.Appointment?.AppointmentService ?? [];
  const shortId = invoice.id.slice(-6).toUpperCase();
  const invoicePrefix = salon?.invoicePrefix ?? "INV";
  const invoiceNumber = `${invoicePrefix}-${shortId}`;
  const taxRate = salon?.taxRate ?? 0;
  const invoiceFooter = salon?.invoiceFooter ?? null;

  // Tax breakdown: when taxRate > 0 we treat invoice.total as the gross (tax-inclusive) amount.
  // subtotal = total / (1 + taxRate/100), taxAmount = total - subtotal
  const hasTax = taxRate > 0;
  const subtotal = hasTax ? invoice.total / (1 + taxRate / 100) : invoice.total;
  const taxAmount = hasTax ? invoice.total - subtotal : 0;

  const statusColor =
    invoice.status === "PAID"
      ? "text-primary"
      : invoice.status === "VOID"
      ? "text-[#F41666]"
      : "text-[#F48E16]";

  return (
    <>
      {/* Print styles — injected inline so they survive server-rendering */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-receipt { box-shadow: none !important; border: none !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>

      <div className="p-8 no-print">
        {/* Back link */}
        <a
          href="/dashboard/invoices"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          ← Back to Invoices
        </a>
      </div>

      {/* Receipt card */}
      <div className="flex justify-center pb-12 px-4">
        <div className="print-receipt w-full max-w-md bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
          {/* Salon header */}
          <div className="bg-primary/10 px-8 py-6 text-center border-b border-border">
            <h1 className="text-2xl font-bold text-foreground">
              {salon?.name ?? "Salon"}
            </h1>
            {salon?.address && (
              <p className="text-sm text-muted-foreground mt-1">{salon.address}</p>
            )}
            {(salon?.city || salon?.country) && (
              <p className="text-sm text-muted-foreground">
                {[salon.city, salon.country].filter(Boolean).join(", ")}
              </p>
            )}
            {salon?.phone && (
              <p className="text-sm text-muted-foreground">{salon.phone}</p>
            )}
            {salon?.email && (
              <p className="text-sm text-muted-foreground">{salon.email}</p>
            )}
          </div>

          <div className="px-8 py-6 space-y-6">
            {/* Invoice meta */}
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Invoice
                </p>
                <p className="font-mono font-bold text-foreground text-lg">
                  {invoiceNumber}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Date
                </p>
                <p className="text-sm font-medium text-foreground">
                  {new Date(invoice.createdAt).toLocaleDateString("en", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            {/* Client info */}
            {invoice.Client && (
              <div className="rounded-xl bg-secondary/60 px-4 py-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Client
                </p>
                <p className="font-semibold text-foreground">
                  {invoice.Client.name}
                </p>
                {invoice.Client.phone && (
                  <p className="text-sm text-muted-foreground">
                    {invoice.Client.phone}
                  </p>
                )}
                {invoice.Client.email && (
                  <p className="text-sm text-muted-foreground">
                    {invoice.Client.email}
                  </p>
                )}
              </div>
            )}

            {/* Services */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                Services
              </p>
              {services.length > 0 ? (
                <div className="space-y-2">
                  {services.map((s) => (
                    <div
                      key={s.serviceId}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-foreground">{s.Service.name}</span>
                      <span className="text-muted-foreground font-medium">
                        {fmt(s.Service.price)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No itemised services
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-border" />

            {/* Total + payment */}
            <div className="space-y-2">
              {hasTax ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground font-medium">{fmt(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                    <span className="text-foreground font-medium">{fmt(taxAmount)}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between font-bold text-lg">
                    <span className="text-foreground">Total</span>
                    <span className="text-foreground">{fmt(invoice.total)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between font-bold text-lg">
                  <span className="text-foreground">Total</span>
                  <span className="text-foreground">{fmt(invoice.total)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="text-foreground font-medium capitalize">
                  {invoice.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className={`font-semibold ${statusColor}`}>
                  {invoice.status}
                </span>
              </div>
            </div>

            {/* Footer message or default thank you */}
            {invoiceFooter ? (
              <p className="text-center text-xs text-muted-foreground pt-2 whitespace-pre-wrap">
                {invoiceFooter}
              </p>
            ) : (
              <p className="text-center text-xs text-muted-foreground pt-2">
                Thank you for your visit!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons — client component + print link */}
      <div className="flex justify-center gap-3 pb-16 no-print">
        <a
          href={`/dashboard/invoices/${id}/print`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 border border-border text-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-secondary/60 transition-colors shadow-sm"
        >
          ↗ Open Print View
        </a>
        <PrintButton />
      </div>
    </>
  );
}
