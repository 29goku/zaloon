import { getInvoice } from "@/app/actions/invoices";
import { notFound } from "next/navigation";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getInvoice(id);

  if (!data) notFound();

  const { invoice, salon, invoiceNumber } = data;

  const currency = salon?.currency ?? "USD";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(n);

  const services = invoice.Appointment?.AppointmentService ?? [];
  const taxRate = salon?.taxRate ?? 0;
  const invoiceFooter = salon?.invoiceFooter ?? null;

  const hasTax = taxRate > 0;
  const subtotal = hasTax ? invoice.total / (1 + taxRate / 100) : invoice.total;
  const taxAmount = hasTax ? invoice.total - subtotal : 0;

  return (
    <>
      {/* Print CSS: hide no-print elements, clean body, full-width receipt */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; margin: 0; }
          .print-page { padding: 0 !important; }
          .receipt-card {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            margin: 0 !important;
          }
        }
      `}</style>

      <div className="print-page min-h-screen bg-background py-10 px-4">
        {/* Toolbar — hidden when printing */}
        <div className="no-print max-w-lg mx-auto flex items-center justify-between mb-6">
          <a
            href={`/dashboard/invoices/${invoice.id}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Invoice
          </a>
          <PrintButton />
        </div>

        {/* Receipt card */}
        <div className="receipt-card max-w-lg mx-auto bg-white text-gray-900 border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
          {/* Salon letterhead */}
          <div className="bg-gray-50 px-8 py-6 text-center border-b border-gray-200">
            <h1 className="text-2xl font-bold">{salon?.name ?? "Salon"}</h1>
            {salon?.address && (
              <p className="text-sm text-gray-500 mt-1">{salon.address}</p>
            )}
            {(salon?.city || salon?.country) && (
              <p className="text-sm text-gray-500">
                {[salon?.city, salon?.country].filter(Boolean).join(", ")}
              </p>
            )}
            {salon?.phone && (
              <p className="text-sm text-gray-500">{salon.phone}</p>
            )}
            {salon?.email && (
              <p className="text-sm text-gray-500">{salon.email}</p>
            )}
          </div>

          <div className="px-8 py-6 space-y-6">
            {/* Invoice meta */}
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">
                  Invoice
                </p>
                <p className="font-mono font-bold text-lg">{invoiceNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wide">
                  Date
                </p>
                <p className="text-sm font-medium">
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
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                  Client
                </p>
                <p className="font-semibold">{invoice.Client.name}</p>
                {invoice.Client.phone && (
                  <p className="text-sm text-gray-500">{invoice.Client.phone}</p>
                )}
                {invoice.Client.email && (
                  <p className="text-sm text-gray-500">{invoice.Client.email}</p>
                )}
              </div>
            )}

            {/* Services list */}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
                Services
              </p>
              {services.length > 0 ? (
                <div className="space-y-2">
                  {services.map((s) => (
                    <div key={s.serviceId} className="flex justify-between text-sm">
                      <span>{s.Service.name}</span>
                      <span className="text-gray-600 font-medium">
                        {fmt(s.Service.price)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  No itemised services
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-gray-200" />

            {/* Totals */}
            <div className="space-y-2">
              {hasTax ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium">{fmt(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tax ({taxRate}%)</span>
                    <span className="font-medium">{fmt(taxAmount)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{fmt(invoice.total)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{fmt(invoice.total)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Payment Method</span>
                <span className="font-medium capitalize">
                  {invoice.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <span
                  className={`font-semibold ${
                    invoice.status === "PAID"
                      ? "text-green-600"
                      : invoice.status === "VOID"
                      ? "text-red-500"
                      : "text-amber-500"
                  }`}
                >
                  {invoice.status}
                </span>
              </div>
            </div>

            {/* Footer */}
            {invoiceFooter ? (
              <p className="text-center text-xs text-gray-400 pt-2 whitespace-pre-wrap">
                {invoiceFooter}
              </p>
            ) : (
              <p className="text-center text-xs text-gray-400 pt-2">
                Thank you for your visit!
              </p>
            )}
          </div>
        </div>

        {/* Bottom print button — hidden when printing */}
        <div className="no-print max-w-lg mx-auto flex justify-center mt-6">
          <PrintButton />
        </div>
      </div>
    </>
  );
}
