import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { InvoiceActions } from "./invoice-actions";
import { InvoiceNotes } from "./invoice-notes";
import { InvoicePaymentTimeline } from "./invoice-payment-timeline";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [invoice, salon, totalInvoiceCount] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        Client: {
          include: {
            Invoice: {
              orderBy: { createdAt: "desc" },
              take: 4, // 4 so we can skip current and show 3
              select: {
                id: true,
                total: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
        Appointment: {
          include: {
            AppointmentService: {
              include: { Service: true },
            },
          },
        },
        PartialPayment: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.salon.findFirst(),
    prisma.invoice.count(),
  ]);

  if (!invoice) notFound();

  const currency = salon?.currency ?? "USD";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(n);

  const services = invoice.Appointment?.AppointmentService ?? [];
  const invoicePrefix = salon?.invoicePrefix ?? "INV";
  const invoiceNumber = `${invoicePrefix}-${String(totalInvoiceCount).padStart(4, "0")}`;
  const taxRate = salon?.taxRate ?? 0;
  const invoiceFooter = salon?.invoiceFooter ?? null;

  // Tax breakdown: treat invoice.total as tax-inclusive when taxRate > 0
  const hasTax = taxRate > 0;
  const subtotal = hasTax ? invoice.total / (1 + taxRate / 100) : invoice.total;
  const taxAmount = hasTax ? invoice.total - subtotal : 0;

  const isVoid = invoice.status === "VOID";

  const statusColor =
    invoice.status === "PAID"
      ? "text-primary"
      : invoice.status === "VOID"
      ? "text-[#F41666]"
      : "text-[#F48E16]";

  // Build duplicate payload
  const duplicateData = {
    salonId: invoice.salonId,
    clientId: invoice.clientId ?? undefined,
    total: invoice.total,
    paymentMethod: invoice.paymentMethod,
    items: services.map((s) => ({ name: s.Service.name, price: s.Service.price })),
  };

  // Related invoices: other invoices from same client (exclude current)
  const relatedInvoices = invoice.Client?.Invoice
    ? invoice.Client.Invoice.filter((inv) => inv.id !== id).slice(0, 3)
    : [];

  // Partial payments serialised for client component
  const partialPayments = invoice.PartialPayment.map((p) => ({
    id: p.id,
    amount: p.amount,
    method: p.method,
    note: p.note,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-receipt { box-shadow: none !important; border: none !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>

      <div className="p-4 md:p-8 no-print">
        <a
          href="/dashboard/invoices"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          ← Back to Invoices
        </a>

        {/* VOID banner */}
        {isVoid && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-[#F41666]/10 border border-[#F41666]/30 px-4 py-3 text-[#F41666] text-sm font-semibold">
            <span className="text-lg">⊘</span>
            This invoice has been voided and is no longer valid.
          </div>
        )}
      </div>

      {/* Main layout: receipt + sidebar panels */}
      <div className="flex flex-col xl:flex-row gap-8 px-4 pb-16 xl:px-8 items-start">
        {/* LEFT: Receipt card */}
        <div className="flex-1 min-w-0 flex justify-center">
          <div
            className={`print-receipt w-full max-w-md bg-card border rounded-2xl shadow-lg overflow-hidden ${
              isVoid ? "border-[#F41666]/40 opacity-75" : "border-border"
            }`}
          >
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
                  {[salon?.city, salon?.country].filter(Boolean).join(", ")}
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
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Invoice</p>
                  <p className="font-mono font-bold text-foreground text-lg">{invoiceNumber}</p>
                  {invoice.isRecurring && (
                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                      ↻ Recurring
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Date</p>
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
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Client</p>
                  <p className="font-semibold text-foreground">{invoice.Client.name}</p>
                  {invoice.Client.phone && (
                    <p className="text-sm text-muted-foreground">{invoice.Client.phone}</p>
                  )}
                  {invoice.Client.email && (
                    <p className="text-sm text-muted-foreground">{invoice.Client.email}</p>
                  )}
                </div>
              )}

              {/* Line items */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Services</p>
                {services.length > 0 ? (
                  <div className="space-y-2">
                    {services.map((s) => (
                      <div
                        key={s.serviceId}
                        className="flex justify-between items-start text-sm"
                      >
                        <div className="flex-1">
                          <span className="text-foreground font-medium">{s.Service.name}</span>
                          {s.Service.durationMins > 0 && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {s.Service.durationMins} min
                            </span>
                          )}
                        </div>
                        <span className="text-foreground font-semibold tabular-nums ml-4">
                          {fmt(s.Service.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No itemised services</p>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-border" />

              {/* Totals + payment method + status */}
              <div className="space-y-2">
                {hasTax ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="text-foreground font-medium tabular-nums">{fmt(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                      <span className="text-foreground font-medium tabular-nums">{fmt(taxAmount)}</span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between font-bold text-lg">
                      <span className="text-foreground">Total</span>
                      <span className="text-foreground tabular-nums">{fmt(invoice.total)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between font-bold text-lg">
                    <span className="text-foreground">Total</span>
                    <span className="text-foreground tabular-nums">{fmt(invoice.total)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment Method</span>
                  <span className="text-foreground font-medium capitalize">
                    {invoice.paymentMethod.charAt(0).toUpperCase() +
                      invoice.paymentMethod.slice(1).toLowerCase()}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`font-semibold ${statusColor}`}>{invoice.status}</span>
                </div>

                {/* Note */}
                {invoice.note && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Note</p>
                    <p className="text-sm text-foreground">{invoice.note}</p>
                  </div>
                )}

                {/* Client-facing notes on receipt */}
                {invoice.clientNotes && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Additional Note</p>
                    <p className="text-sm text-foreground">{invoice.clientNotes}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
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

        {/* RIGHT: sidebar panels */}
        <div className="w-full xl:w-96 space-y-4 no-print">
          {/* Payment timeline */}
          <InvoicePaymentTimeline
            invoiceId={id}
            invoiceTotal={invoice.total}
            status={invoice.status}
            createdAt={invoice.createdAt.toISOString()}
            paidAt={invoice.paidAt ? invoice.paidAt.toISOString() : null}
            partialPayments={partialPayments}
            currency={currency}
          />

          {/* Notes */}
          <InvoiceNotes
            invoiceId={id}
            initialInternalNotes={invoice.internalNotes ?? null}
            initialClientNotes={invoice.clientNotes ?? null}
          />

          {/* Related invoices */}
          {relatedInvoices.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">
                Other invoices from {invoice.Client?.name}
              </p>
              <div className="space-y-2">
                {relatedInvoices.map((related) => (
                  <Link
                    key={related.id}
                    href={`/dashboard/invoices/${related.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/40 transition-colors group"
                  >
                    <div>
                      <p className="text-xs font-mono text-primary group-hover:underline">
                        {related.id.slice(-8).toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(related.createdAt).toLocaleDateString("en", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {fmt(related.total)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          related.status === "PAID"
                            ? "bg-primary/20 text-primary"
                            : related.status === "VOID"
                            ? "bg-[#F41666]/20 text-[#F41666]"
                            : "bg-[#F48E16]/20 text-[#F48E16]"
                        }`}
                      >
                        {related.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <InvoiceActions invoiceId={id} status={invoice.status} duplicateData={duplicateData} />
    </>
  );
}
