import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string; clientId: string }>;
}

type InvoiceRow = {
  id: string;
  total: number;
  status: string;
  paymentMethod: string;
  createdAt: Date;
  note: string | null;
  Appointment: {
    date: string;
    AppointmentService: { Service: { name: string } }[];
  } | null;
  InvoiceItem: { id: string; name: string; price: number; qty: number }[];
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function statusBadge(status: string) {
  const s = status.toUpperCase();
  if (s === "PAID") {
    return (
      <span className="inline-flex items-center rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs font-medium text-green-700">
        Paid
      </span>
    );
  }
  if (s === "PENDING") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-700">
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5 text-xs font-medium text-stone-600">
      {status}
    </span>
  );
}

async function getClientInvoices(slug: string, clientId: string) {
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!salon) return null;

  const client = await prisma.client.findFirst({
    where: { id: clientId, salonId: salon.id },
    select: { id: true, name: true },
  });
  if (!client) return null;

  const invoices = await prisma.invoice.findMany({
    where: { clientId, salonId: salon.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      total: true,
      status: true,
      paymentMethod: true,
      createdAt: true,
      note: true,
      Appointment: {
        select: {
          date: true,
          AppointmentService: {
            select: { Service: { select: { name: true } } },
          },
        },
      },
      InvoiceItem: {
        select: { id: true, name: true, price: true, qty: true },
      },
    },
  });

  return { salon, client, invoices: invoices as InvoiceRow[] };
}

export default async function ClientInvoicesPage({ params }: PageProps) {
  const { slug, clientId } = await params;
  const data = await getClientInvoices(slug, clientId);

  if (!data) notFound();

  const { salon, invoices } = data;

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
      {/* Back link */}
      <Link
        href={`/portal/${slug}/${clientId}`}
        className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to my account
      </Link>

      {/* Heading */}
      <div>
        <h1 className="text-xl font-bold text-stone-900">My invoices</h1>
        <p className="text-sm text-stone-400 mt-1">
          Receipt history from {salon.name}.
        </p>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-xl border border-stone-100 bg-white px-6 py-12 text-center shadow-sm">
          <svg
            className="w-10 h-10 text-stone-300 mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
          <p className="text-stone-500 text-sm">No invoices yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            // Build services summary from appointment services or invoice items
            const serviceNames =
              inv.Appointment?.AppointmentService?.map((as) => as.Service.name) ??
              inv.InvoiceItem.map((item) => item.name);
            const summary = serviceNames.join(", ") || "Services";

            // Date: prefer appointment date, fall back to invoice createdAt
            const displayDate = inv.Appointment?.date
              ? new Date(inv.Appointment.date + "T00:00:00").toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric", year: "numeric" }
                )
              : formatDate(inv.createdAt);

            return (
              <div
                key={inv.id}
                className="rounded-xl border border-stone-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-900 truncate">
                      {summary}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">{displayDate}</p>
                    {inv.note && (
                      <p className="text-xs text-stone-400 mt-0.5 truncate">
                        {inv.note}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right space-y-1">
                    <p className="text-sm font-bold text-stone-900">
                      {formatCurrency(inv.total)}
                    </p>
                    {statusBadge(inv.status)}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/dashboard/invoices/${inv.id}/receipt`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                  >
                    View receipt
                  </Link>
                  <Link
                    href={`/dashboard/invoices/${inv.id}/print`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors flex items-center gap-1"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z"
                      />
                    </svg>
                    Download PDF
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
