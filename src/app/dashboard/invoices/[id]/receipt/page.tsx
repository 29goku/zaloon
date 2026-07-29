import { getInvoice } from "@/app/actions/invoices";
import { getTaxSettings } from "@/app/actions/settings";
import { notFound } from "next/navigation";
import { AutoPrint } from "../print/auto-print";
import { PrintButton } from "../print-button";
import { getClientTier } from "@/lib/loyalty-tiers";

export const dynamic = "force-dynamic";

export default async function InvoiceReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, taxSettings] = await Promise.all([
    getInvoice(id),
    getTaxSettings(),
  ]);

  if (!data) notFound();

  const { invoice, salon, invoiceNumber } = data;

  const currency = salon?.currency ?? "USD";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(n);

  const appointmentServices = invoice.Appointment?.AppointmentService ?? [];
  // Fall back to InvoiceItem if no appointment services
  const invoiceItems = (invoice as { InvoiceItem?: { id: string; name: string; price: number; qty: number }[] }).InvoiceItem ?? [];

  // Use taxSettings if enabled, fall back to salon.taxRate
  const taxRate = taxSettings.enabled ? taxSettings.taxRate : (salon?.taxRate ?? 0);
  const taxName = taxSettings.enabled ? (taxSettings.taxName || "Tax") : "Tax";
  const taxNumber = taxSettings.enabled ? taxSettings.taxNumber : null;
  const includeTaxInPrice = taxSettings.enabled ? taxSettings.includeTaxInPrice : true;
  const invoiceFooter = salon?.invoiceFooter ?? null;

  const hasTax = taxRate > 0;
  const subtotal = hasTax
    ? (includeTaxInPrice ? invoice.total / (1 + taxRate / 100) : invoice.total)
    : invoice.total;
  const taxAmount = hasTax ? (includeTaxInPrice ? invoice.total - subtotal : subtotal * (taxRate / 100)) : 0;
  const invoiceTotal = hasTax && !includeTaxInPrice ? subtotal + taxAmount : invoice.total;

  const formattedDate = new Date(invoice.createdAt).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const paymentLabel =
    invoice.paymentMethod.charAt(0).toUpperCase() +
    invoice.paymentMethod.slice(1).toLowerCase();

  // ── Loyalty points earned for this invoice ──────────────────────────────────
  const clientLoyaltyPoints = (invoice.Client as { loyaltyPoints?: number } | null)?.loyaltyPoints ?? null;
  let loyaltyPointsEarned: number | null = null;
  let loyaltyTierName: string | null = null;
  if (clientLoyaltyPoints !== null && invoice.status === "PAID") {
    const tier = getClientTier(clientLoyaltyPoints);
    loyaltyPointsEarned = Math.floor(invoice.total * tier.pointMultiplier);
    loyaltyTierName = tier.name;
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }

        body {
          font-family: "Courier New", Courier, monospace;
          background: #f3f4f6;
          margin: 0;
          padding: 0;
          color: #111;
        }

        /* Dashed separator used multiple times */
        .receipt-sep {
          border: none;
          border-top: 1px dashed #aaa;
          margin: 10px 0;
        }

        @media print {
          .no-print { display: none !important; }
          body {
            background: white !important;
            color: black !important;
            margin: 0;
            padding: 0;
          }
          .receipt-shell { padding: 0 !important; background: white !important; }
          .receipt-card {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            border-radius: 0 !important;
            padding: 6mm 4mm !important;
          }
          @page {
            /* 80mm thermal printer width; height auto */
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>

      <AutoPrint />

      {/* Screen toolbar */}
      <div className="no-print bg-gray-100 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <a
          href={`/dashboard/invoices/${invoice.id}`}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium"
        >
          ← Back to Invoice
        </a>
        <div className="flex items-center gap-3">
          <a
            href={`/dashboard/invoices/${invoice.id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white transition-colors"
          >
            Invoice View
          </a>
          <PrintButton />
        </div>
      </div>

      {/* Receipt shell — centers the narrow card on screen */}
      <div className="receipt-shell min-h-screen bg-gray-100 py-10 px-4 flex justify-center">
        {/*
          receipt-card: max-width 300px simulates a 58–80 mm thermal roll.
          All text is monospace to mimic thermal printer output.
        */}
        <div
          className="receipt-card bg-white border border-gray-200 rounded-xl shadow-md p-6"
          style={{ width: "100%", maxWidth: "300px" }}
        >
          {/* ── Salon header ── */}
          <div style={{ textAlign: "center", marginBottom: "8px" }}>
            {salon?.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={salon.logo}
                alt=""
                style={{
                  height: "40px",
                  width: "auto",
                  objectFit: "contain",
                  display: "block",
                  margin: "0 auto 6px",
                }}
              />
            )}
            <div
              style={{
                fontSize: "15px",
                fontWeight: "bold",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              {salon?.name ?? "Salon"}
            </div>
            {salon?.address && (
              <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>
                {salon.address}
              </div>
            )}
            {(salon?.city || salon?.country) && (
              <div style={{ fontSize: "11px", color: "#555" }}>
                {[salon?.city, salon?.country].filter(Boolean).join(", ")}
              </div>
            )}
            {salon?.phone && (
              <div style={{ fontSize: "11px", color: "#555" }}>{salon.phone}</div>
            )}
            {salon?.email && (
              <div style={{ fontSize: "11px", color: "#555" }}>{salon.email}</div>
            )}
          </div>

          <hr className="receipt-sep" />

          {/* ── Invoice meta ── */}
          <div style={{ fontSize: "11px", color: "#555", lineHeight: "1.6" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Receipt:</span>
              <span style={{ fontWeight: "bold", color: "#111" }}>
                {invoiceNumber}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Date:</span>
              <span>{formattedDate}</span>
            </div>
            {invoice.Client && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Client:</span>
                <span style={{ fontWeight: "bold", color: "#111" }}>
                  {invoice.Client.name}
                </span>
              </div>
            )}
          </div>

          <hr className="receipt-sep" />

          {/* ── Services (from appointment or invoice items) ── */}
          {appointmentServices.length > 0 ? (
            <div>
              {appointmentServices.map((s) => (
                <div
                  key={s.serviceId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    paddingBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      paddingRight: "8px",
                    }}
                  >
                    {s.Service.name}
                  </span>
                  <span style={{ fontWeight: "600", whiteSpace: "nowrap" }}>
                    {fmt(s.Service.price)}
                  </span>
                </div>
              ))}
            </div>
          ) : invoiceItems.length > 0 ? (
            <div>
              {invoiceItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    paddingBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      paddingRight: "8px",
                    }}
                  >
                    {item.qty > 1 ? `${item.qty}x ` : ""}{item.name}
                  </span>
                  <span style={{ fontWeight: "600", whiteSpace: "nowrap" }}>
                    {fmt(item.price * item.qty)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "11px", color: "#999", fontStyle: "italic" }}>
              No itemised services
            </p>
          )}

          <hr className="receipt-sep" />

          {/* ── Totals ── */}
          <div style={{ fontSize: "12px" }}>
            {hasTax && (
              <>
                <div
                  style={{ display: "flex", justifyContent: "space-between", color: "#555" }}
                >
                  <span>Subtotal</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                {invoice.discount > 0 && (
                  <div
                    style={{ display: "flex", justifyContent: "space-between", color: "#555" }}
                  >
                    <span>Discount</span>
                    <span>-{fmt(invoice.discount)}</span>
                  </div>
                )}
                <div
                  style={{ display: "flex", justifyContent: "space-between", color: "#555" }}
                >
                  <span>{taxName} ({taxRate}%){taxNumber ? ` · ${taxNumber}` : ""}</span>
                  <span>{fmt(taxAmount)}</span>
                </div>
              </>
            )}

            {!hasTax && invoice.discount > 0 && (
              <div
                style={{ display: "flex", justifyContent: "space-between", color: "#555" }}
              >
                <span>Discount</span>
                <span>-{fmt(invoice.discount)}</span>
              </div>
            )}

            {/* Tip */}
            {invoice.tip > 0 && (
              <div
                style={{ display: "flex", justifyContent: "space-between", color: "#16a34a" }}
              >
                <span>Tip</span>
                <span>+{fmt(invoice.tip)}</span>
              </div>
            )}

            {/* TOTAL — large and prominent */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: "900",
                fontSize: "20px",
                marginTop: "6px",
                paddingTop: "6px",
                borderTop: "2px solid #111",
              }}
            >
              <span>TOTAL</span>
              <span>{fmt(invoiceTotal)}</span>
            </div>
            {hasTax && includeTaxInPrice && (
              <div style={{ fontSize: "10px", color: "#999", marginTop: "2px" }}>
                * Prices are tax-inclusive
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "6px",
                color: "#555",
                fontSize: "11px",
              }}
            >
              <span>Payment</span>
              <span style={{ fontWeight: "bold", color: "#111" }}>
                {paymentLabel}
              </span>
            </div>

            {/* Status badge */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "4px",
                color: "#555",
                fontSize: "11px",
              }}
            >
              <span>Status</span>
              <span
                style={{
                  fontWeight: "bold",
                  color:
                    invoice.status === "PAID"
                      ? "#16a34a"
                      : invoice.status === "VOID"
                      ? "#dc2626"
                      : "#d97706",
                }}
              >
                {invoice.status}
              </span>
            </div>
          </div>

          {/* ── Loyalty points ── */}
          {loyaltyPointsEarned !== null && loyaltyPointsEarned > 0 && (
            <>
              <hr className="receipt-sep" />
              <div style={{ fontSize: "11px", color: "#555", textAlign: "center" }}>
                <div style={{ fontWeight: "bold", color: "#111", marginBottom: "2px" }}>
                  🌟 {loyaltyPointsEarned} points earned
                </div>
                <div>
                  Total loyalty points: {clientLoyaltyPoints} pts
                  {loyaltyTierName && (
                    <span> ({loyaltyTierName})</span>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── Note ── */}
          {invoice.clientNotes && (
            <>
              <hr className="receipt-sep" />
              <p style={{ fontSize: "11px", color: "#555", margin: 0 }}>
                {invoice.clientNotes}
              </p>
            </>
          )}

          <hr className="receipt-sep" />

          {/* ── Footer / thank you ── */}
          <div style={{ textAlign: "center", fontSize: "12px" }}>
            <p style={{ fontWeight: "bold", margin: "0 0 4px" }}>
              {invoiceFooter ?? `Thank you for visiting ${salon?.name ?? "us"}!`}
            </p>
            {salon?.slug && (
              <>
                {/* QR placeholder — text only; swap with a real <QRCode> lib if needed */}
                <div
                  style={{
                    display: "inline-block",
                    border: "2px solid #111",
                    padding: "8px",
                    margin: "6px auto",
                    fontSize: "9px",
                    letterSpacing: "0",
                    color: "#555",
                    lineHeight: "1.3",
                  }}
                >
                  [QR CODE]
                  <br />
                  Book online
                </div>
                <p style={{ fontSize: "11px", color: "#555", margin: "4px 0 0" }}>
                  book.zaloon.com/{salon.slug}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
