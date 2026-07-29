import { prisma } from "@/lib/prisma";
import { AutoPrint } from "../[id]/print/auto-print";

export const dynamic = "force-dynamic";

export default async function BatchPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  const idList = (ids ?? "").split(",").filter(Boolean);

  if (idList.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        No invoice IDs provided. Close this tab and select invoices to print.
      </div>
    );
  }

  const [invoices, salon, totalCount] = await Promise.all([
    prisma.invoice.findMany({
      where: { id: { in: idList } },
      include: {
        Client: true,
        Appointment: {
          include: {
            Staff: true,
            AppointmentService: {
              include: { Service: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.salon.findFirst(),
    prisma.invoice.count(),
  ]);

  const currency = salon?.currency ?? "USD";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(n);

  const prefix = salon?.invoicePrefix ?? "INV";
  const taxRate = salon?.taxRate ?? 0;
  const invoiceFooter = salon?.invoiceFooter ?? null;

  // Build a stable invoice number for each (approximation using total count)
  function invoiceNumber(idx: number) {
    return `${prefix}-${String(totalCount - idx).padStart(4, "0")}`;
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
          background: #f3f4f6;
          margin: 0;
          padding: 0;
          color: #111;
        }

        .page-break {
          page-break-after: always;
          break-after: page;
        }

        @media print {
          .no-print { display: none !important; }

          body {
            background: white !important;
            color: black !important;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-shell {
            padding: 0 !important;
            background: white !important;
          }

          .invoice-card {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }

          .page-break {
            page-break-after: always;
            break-after: page;
            height: 0;
            margin: 0;
            padding: 0;
            border: none;
          }

          @page {
            margin: 15mm 15mm 15mm 15mm;
            size: A4 portrait;
          }
        }
      `}</style>

      <AutoPrint />

      {/* Screen toolbar */}
      <div className="no-print bg-gray-100 border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <span className="text-sm font-medium text-gray-700">
          Batch Print — {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.close()}
            className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white transition-colors"
          >
            Close Tab
          </button>
          <button
            onClick={() => window.print()}
            className="text-sm px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
          >
            Print All ({invoices.length})
          </button>
        </div>
      </div>

      {/* Invoices — one per printed page */}
      <div className="print-shell py-8 px-4 space-y-8 bg-gray-100 min-h-screen">
        {invoices.map((invoice, i) => {
          const services = invoice.Appointment?.AppointmentService ?? [];
          const staffName = invoice.Appointment?.Staff?.name ?? null;
          const hasTax = taxRate > 0;
          const subtotal = hasTax ? invoice.total / (1 + taxRate / 100) : invoice.total;
          const taxAmount = hasTax ? invoice.total - subtotal : 0;
          const formattedDate = new Date(invoice.createdAt).toLocaleDateString("en", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
          const paymentLabel =
            invoice.paymentMethod.charAt(0).toUpperCase() +
            invoice.paymentMethod.slice(1).toLowerCase();
          const invNum = invoiceNumber(i);

          return (
            <div key={invoice.id}>
              {/* Invoice card */}
              <div className="invoice-card max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">

                {/* Header */}
                <div className="flex items-start justify-between px-10 py-8 border-b border-gray-100">
                  <div>
                    {salon?.logo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={salon.logo}
                        alt={salon.name ?? "Salon logo"}
                        className="h-12 w-auto mb-2 object-contain"
                      />
                    )}
                    {!salon?.logo && (
                      <div
                        className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg mb-2"
                        style={{ background: "#7c3aed" }}
                      >
                        {(salon?.name ?? "S").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                      {salon?.name ?? "Salon"}
                    </h1>
                    {salon?.address && (
                      <p className="text-sm text-gray-500 mt-0.5">{salon.address}</p>
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

                  <div className="text-right">
                    <p className="text-3xl font-extrabold text-gray-900 tracking-tight uppercase">
                      Invoice
                    </p>
                    <p className="font-mono font-bold text-lg text-gray-700 mt-1">
                      #{invNum}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Date: {formattedDate}</p>
                    <span
                      className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        invoice.status === "PAID"
                          ? "bg-green-100 text-green-700"
                          : invoice.status === "VOID"
                          ? "bg-red-100 text-red-600"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </div>
                </div>

                {/* Bill To */}
                {invoice.Client && (
                  <div className="px-10 py-6 border-b border-gray-100 bg-gray-50">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
                      Bill To
                    </p>
                    <p className="text-base font-bold text-gray-900">
                      {invoice.Client.name}
                    </p>
                    {invoice.Client.phone && (
                      <p className="text-sm text-gray-500">{invoice.Client.phone}</p>
                    )}
                    {invoice.Client.email && (
                      <p className="text-sm text-gray-500">{invoice.Client.email}</p>
                    )}
                  </div>
                )}

                {/* Services table */}
                <div className="px-10 pt-6 pb-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                    Services
                  </p>

                  {services.length > 0 ? (
                    <>
                      <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 pb-2 border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        <span>Description</span>
                        <span className="text-center">Staff</span>
                        <span className="text-right">Amount</span>
                      </div>

                      <div className="divide-y divide-gray-100">
                        {services.map((s) => (
                          <div
                            key={s.serviceId}
                            className="grid grid-cols-[1fr_auto_auto] gap-x-6 py-3 text-sm items-center"
                          >
                            <div>
                              <span className="font-medium text-gray-900">
                                {s.Service.name}
                              </span>
                              {s.Service.durationMins > 0 && (
                                <span className="ml-2 text-xs text-gray-400">
                                  {s.Service.durationMins} min
                                </span>
                              )}
                            </div>
                            <span className="text-center text-gray-500 text-xs">
                              {staffName ?? "—"}
                            </span>
                            <span className="text-right font-semibold tabular-nums text-gray-900">
                              {fmt(s.Service.price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 italic py-4">
                      No itemised services
                    </p>
                  )}
                </div>

                {/* Totals */}
                <div className="px-10 py-6 border-t border-dashed border-gray-200">
                  <div className="max-w-xs ml-auto space-y-2">
                    {hasTax && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Subtotal</span>
                          <span className="font-medium tabular-nums text-gray-800">
                            {fmt(subtotal)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Tax ({taxRate}%)</span>
                          <span className="font-medium tabular-nums text-gray-800">
                            {fmt(taxAmount)}
                          </span>
                        </div>
                        <div className="border-t border-gray-300 pt-2" />
                      </>
                    )}
                    <div className="flex justify-between font-extrabold text-xl text-gray-900">
                      <span>Total</span>
                      <span className="tabular-nums">{fmt(invoice.total)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-1">
                      <span className="text-gray-500">Payment Method</span>
                      <span className="font-medium text-gray-800">{paymentLabel}</span>
                    </div>
                  </div>
                </div>

                {/* Note */}
                {invoice.note && (
                  <div className="px-10 pb-4 border-t border-gray-100 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
                      Note
                    </p>
                    <p className="text-sm text-gray-700">{invoice.note}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="px-10 py-6 bg-gray-50 border-t border-gray-100 text-center">
                  <p className="text-sm font-semibold text-gray-700">
                    {invoiceFooter ?? "Thank you for visiting!"}
                  </p>
                  {salon?.slug && (
                    <p className="text-xs text-gray-400 mt-1">
                      Book online: book.zaloon.com/{salon.slug}
                    </p>
                  )}
                </div>
              </div>

              {/* Page break between invoices (last one gets none) */}
              {i < invoices.length - 1 && <div className="page-break" />}
            </div>
          );
        })}
      </div>
    </>
  );
}
