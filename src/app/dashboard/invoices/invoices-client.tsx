"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  Printer,
  Ban,
  CheckCircle2,
  Download,
  BarChart2,
  Repeat,
  ChevronDown,
  ChevronRight,
  FileText,
  ChevronUp,
  ChevronsUpDown,
  FileDown,
} from "lucide-react";
import { voidInvoices, markInvoicePaid } from "@/app/actions/invoices";
import { InvoiceDetailModal } from "@/components/invoices/invoice-detail-modal";
import { InlineConfirm } from "@/components/ui/inline-confirm";

// ─── types ────────────────────────────────────────────────────────────────────

export interface PartialPaymentSummary {
  id: string;
  amount: number;
  method: string;
  note: string | null;
  createdAt: string;
}

export interface InvoiceSummary {
  id: string;
  status: string;
  total: number;
  tip: number;
  discount: number;
  paymentMethod: string;
  createdAt: string; // ISO string
  isRecurring: boolean;
  clientName: string | null;
  invoiceNum: string;
  servicesSummary: string;
  partialPayments: PartialPaymentSummary[];
  appointmentId: string | null;
  paidAt: string | null;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-primary/20 text-primary",
  VOID: "bg-[#F41666]/20 text-[#F41666]",
  PENDING: "bg-[#F48E16]/20 text-[#F48E16]",
  PARTIAL: "bg-blue-500/20 text-blue-400",
};

type SortKey = "invoiceNum" | "createdAt" | "clientName" | "total" | "status" | "paymentMethod";
type SortDir = "asc" | "desc";

function agingBucket(createdAt: string): "current" | "7-14" | "15-30" | "30+" {
  const diffDays = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  if (diffDays < 7) return "current";
  if (diffDays < 15) return "7-14";
  if (diffDays < 31) return "15-30";
  return "30+";
}

const BUCKET_LABELS: Record<string, string> = {
  current: "Current (< 7 days)",
  "7-14": "7–14 days",
  "15-30": "15–30 days",
  "30+": "30+ days overdue",
};

const BUCKET_COLOR: Record<string, string> = {
  current: "text-primary border-primary/40",
  "7-14": "text-[#F48E16] border-[#F48E16]/40",
  "15-30": "text-orange-400 border-orange-400/40",
  "30+": "text-[#F41666] border-[#F41666]/40",
};

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportToCSV(rows: InvoiceSummary[], filename: string) {
  const header = ["Invoice #", "Date", "Client", "Services", "Method", "Amount", "Tip", "Discount", "Status"];
  const csvRows = rows.map((r) => [
    r.invoiceNum,
    new Date(r.createdAt).toLocaleDateString("en"),
    r.clientName ?? "Walk-in",
    `"${r.servicesSummary.replace(/"/g, '""')}"`,
    r.paymentMethod,
    r.total.toFixed(2),
    r.tip.toFixed(2),
    r.discount.toFixed(2),
    r.status,
  ]);

  const csv = [header.join(","), ...csvRows.map((row) => row.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Revenue chart ────────────────────────────────────────────────────────────

function makeFmt(currency: string) {
  return (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);
}

function RevenueChart({
  invoices,
  currency,
}: {
  invoices: InvoiceSummary[];
  currency: string;
}) {
  const fmt = makeFmt(currency);
  const days = 14;
  const now = new Date();
  const buckets: { label: string; amount: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en", { weekday: "short", day: "numeric" });
    const amount = invoices
      .filter(
        (inv) =>
          inv.status === "PAID" && inv.createdAt.slice(0, 10) === key
      )
      .reduce((s, inv) => s + inv.total, 0);
    buckets.push({ label, amount });
  }

  const max = Math.max(...buckets.map((b) => b.amount), 1);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
        Daily Revenue — last 14 days
      </p>
      <div className="flex items-end gap-1 h-24 overflow-x-auto pb-1">
        {buckets.map((b, i) => {
          const pct = Math.round((b.amount / max) * 100);
          return (
            <div
              key={i}
              className="flex flex-col items-center gap-1 flex-1 min-w-[28px] group"
              title={`${b.label}: ${fmt(b.amount)}`}
            >
              <div className="relative w-full flex items-end justify-center h-16">
                <div
                  className="w-full rounded-t bg-primary/70 group-hover:bg-primary transition-all"
                  style={{ height: `${Math.max(pct, b.amount > 0 ? 4 : 1)}%` }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                {b.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Aging Report ─────────────────────────────────────────────────────────────

function AgingReport({
  invoices,
  currency,
  onMarkPaid,
}: {
  invoices: InvoiceSummary[];
  currency: string;
  onMarkPaid: (id: string) => void;
}) {
  const fmt = makeFmt(currency);
  const unpaid = invoices.filter((i) => i.status === "PENDING" || i.status === "PARTIAL");
  const grouped: Record<string, InvoiceSummary[]> = {
    current: [],
    "7-14": [],
    "15-30": [],
    "30+": [],
  };
  for (const inv of unpaid) {
    grouped[agingBucket(inv.createdAt)].push(inv);
  }

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    current: true,
    "7-14": true,
    "15-30": true,
    "30+": true,
  });

  if (unpaid.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No unpaid invoices — everything is settled.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([bucket, items]) => {
        if (items.length === 0) return null;
        const total = items.reduce((s, i) => s + i.total, 0);
        const isOpen = expanded[bucket];

        return (
          <div key={bucket} className="rounded-xl border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded((e) => ({ ...e, [bucket]: !e[bucket] }))}
              className={`w-full flex items-center justify-between px-4 py-3 bg-secondary/40 hover:bg-secondary/60 transition-colors ${BUCKET_COLOR[bucket]}`}
            >
              <span className="font-semibold text-sm">{BUCKET_LABELS[bucket]}</span>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">
                  {items.length} invoice{items.length !== 1 ? "s" : ""}
                </span>
                <span className="font-bold tabular-nums">{fmt(total)}</span>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {isOpen && (
              <div className="divide-y divide-border/50">
                {items.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-secondary/20"
                  >
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className="font-mono text-primary hover:underline text-xs font-semibold"
                      >
                        {inv.invoiceNum}
                      </Link>
                      <span className="text-foreground">
                        {inv.clientName ?? (
                          <span className="text-muted-foreground italic">Walk-in</span>
                        )}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {new Date(inv.createdAt).toLocaleDateString("en", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold tabular-nums">{fmt(inv.total)}</span>
                      <button
                        type="button"
                        onClick={() => onMarkPaid(inv.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Mark paid
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Sort icon ────────────────────────────────────────────────────────────────

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 ml-0.5 text-muted-foreground/50" />;
  return sortDir === "asc" ? (
    <ChevronUp className="w-3 h-3 ml-0.5 text-primary" />
  ) : (
    <ChevronDown className="w-3 h-3 ml-0.5 text-primary" />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  invoices: InvoiceSummary[];
  allInvoices: InvoiceSummary[];
  currency: string;
}

export function InvoicesClient({ invoices, allInvoices, currency }: Props) {
  const fmt = makeFmt(currency);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "aging" | "chart">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const [voidingBatch, setVoidingBatch] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceSummary | null>(null);
  const [markPaidError, setMarkPaidError] = useState<string | null>(null);

  function handleSort(col: SortKey) {
    if (sortKey === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col);
      setSortDir("asc");
    }
  }

  const sortedInvoices = useMemo(() => {
    return [...invoices].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "invoiceNum") cmp = a.invoiceNum.localeCompare(b.invoiceNum);
      else if (sortKey === "createdAt") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortKey === "clientName") cmp = (a.clientName ?? "").localeCompare(b.clientName ?? "");
      else if (sortKey === "total") cmp = a.total - b.total;
      else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
      else if (sortKey === "paymentMethod") cmp = a.paymentMethod.localeCompare(b.paymentMethod);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [invoices, sortKey, sortDir]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === invoices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(invoices.map((i) => i.id)));
    }
  }

  function handleMarkPaid(id: string) {
    setMarkPaidError(null);
    startTransition(async () => {
      const res = await markInvoicePaid(id, "CASH");
      if (res.success) {
        router.refresh();
      } else {
        setMarkPaidError(res.error ?? "Failed to mark as paid");
      }
    });
  }

  async function handleVoidSelected() {
    if (selected.size === 0) return;
    setVoidingBatch(true);
    const res = await voidInvoices(Array.from(selected));
    setVoidingBatch(false);
    if (res.success) {
      setSelected(new Set());
      router.refresh();
    }
  }

  function handleExportFiltered() {
    const now = new Date();
    exportToCSV(invoices, `invoices-filtered-${now.toISOString().slice(0, 10)}.csv`);
  }

  function handleExportMonthly() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthlyRows = allInvoices.filter((inv) => {
      const d = new Date(inv.createdAt);
      return d >= monthStart && d <= monthEnd;
    });
    const label = now.toLocaleDateString("en", { month: "long", year: "numeric" }).replace(" ", "-");
    exportToCSV(monthlyRows, `invoices-${label}.csv`);
  }

  function handleExportSelected() {
    const ids = Array.from(selected);
    const rows = invoices.filter((i) => ids.includes(i.id));
    exportToCSV(rows, `invoices-selected-${Date.now()}.csv`);
  }

  const tabs = [
    { id: "all" as const, label: "All Invoices" },
    { id: "aging" as const, label: "Aging" },
    { id: "chart" as const, label: "Revenue Chart" },
  ];

  const thClass =
    "pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground select-none cursor-pointer hover:text-foreground transition-colors whitespace-nowrap";

  return (
    <div className="space-y-4">
      {/* Export buttons */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleExportFiltered}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
        >
          <FileDown className="w-3.5 h-3.5" />
          Export filtered
        </button>
        <button
          type="button"
          onClick={handleExportMonthly}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
        >
          <BarChart2 className="w-3.5 h-3.5" />
          Monthly report
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Aging tab */}
      {activeTab === "aging" && (
        <AgingReport invoices={invoices} currency={currency} onMarkPaid={handleMarkPaid} />
      )}

      {/* Revenue chart tab */}
      {activeTab === "chart" && (
        <div className="rounded-xl border border-border bg-card p-6">
          <RevenueChart invoices={invoices} currency={currency} />
        </div>
      )}

      {/* All invoices tab */}
      {activeTab === "all" && (
        <div className="space-y-3">
          {/* Batch action bar */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/30 flex-wrap">
              <span className="text-sm font-medium text-primary">
                {selected.size} selected
              </span>
              {markPaidError && (
                <span className="text-xs text-destructive">{markPaidError}</span>
              )}
              <InlineConfirm
                message={`Void ${selected.size} selected invoice(s)? This cannot be undone.`}
                confirmLabel="Void"
                onConfirm={handleVoidSelected}
                trigger={
                  <button
                    type="button"
                    disabled={voidingBatch}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F41666]/10 text-[#F41666] hover:bg-[#F41666]/20 transition-colors disabled:opacity-50"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    {voidingBatch ? "Voiding…" : "Void selected"}
                  </button>
                }
              />
              <button
                type="button"
                onClick={handleExportSelected}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
              <a
                href={`/dashboard/invoices/batch-print?ids=${Array.from(selected).join(",")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Print selected
              </a>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 pr-3 w-8">
                    <input
                      type="checkbox"
                      className="rounded border-border"
                      checked={selected.size === invoices.length && invoices.length > 0}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className={thClass} onClick={() => handleSort("invoiceNum")}>
                    <span className="inline-flex items-center">
                      Invoice # <SortIcon col="invoiceNum" sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </th>
                  <th className={thClass} onClick={() => handleSort("createdAt")}>
                    <span className="inline-flex items-center">
                      Date <SortIcon col="createdAt" sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </th>
                  <th className={thClass} onClick={() => handleSort("clientName")}>
                    <span className="inline-flex items-center">
                      Client <SortIcon col="clientName" sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </th>
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Services
                  </th>
                  <th className={thClass} onClick={() => handleSort("paymentMethod")}>
                    <span className="inline-flex items-center">
                      Method <SortIcon col="paymentMethod" sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </th>
                  <th className={`${thClass} text-right`} onClick={() => handleSort("total")}>
                    <span className="inline-flex items-center justify-end">
                      Amount <SortIcon col="total" sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </th>
                  <th className={thClass} onClick={() => handleSort("status")}>
                    <span className="inline-flex items-center">
                      Status <SortIcon col="status" sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedInvoices.map((inv) => {
                  const statusClass =
                    STATUS_STYLES[inv.status] ?? "bg-secondary text-muted-foreground";

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedInvoice(inv)}
                      className={`border-b border-border/50 hover:bg-secondary/40 transition-colors cursor-pointer ${
                        selected.has(inv.id) ? "bg-primary/5" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 pr-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-border"
                          checked={selected.has(inv.id)}
                          onChange={() => toggleSelect(inv.id)}
                        />
                      </td>

                      {/* Invoice # */}
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-primary font-semibold">
                            {inv.invoiceNum}
                          </span>
                          {inv.isRecurring && (
                            <span
                              title="Recurring invoice"
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary"
                            >
                              <Repeat className="w-2.5 h-2.5" />
                              Rec
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                        {new Date(inv.createdAt).toLocaleDateString("en", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* Client */}
                      <td className="py-3 pr-4 text-foreground font-medium">
                        {inv.clientName ?? (
                          <span className="text-muted-foreground italic">Walk-in</span>
                        )}
                      </td>

                      {/* Services summary */}
                      <td className="py-3 pr-4 text-muted-foreground max-w-[180px] truncate text-xs">
                        {inv.servicesSummary || (
                          <span className="italic">—</span>
                        )}
                      </td>

                      {/* Payment method */}
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground capitalize">
                          {inv.paymentMethod.charAt(0).toUpperCase() +
                            inv.paymentMethod.slice(1).toLowerCase()}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 pr-4 text-right tabular-nums">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="font-semibold text-foreground">{fmt(inv.total)}</span>
                          {inv.tip > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-500">
                              +{fmt(inv.tip)} tip
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusClass}`}
                        >
                          {inv.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          <Link
                            href={`/dashboard/invoices/${inv.id}`}
                            title="View invoice"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </Link>
                          <Link
                            href={`/dashboard/invoices/${inv.id}/receipt`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Print receipt"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Receipt
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {invoices.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No invoices found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoice detail modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          currency={currency}
          onClose={() => setSelectedInvoice(null)}
          onRefresh={() => router.refresh()}
        />
      )}
    </div>
  );
}
