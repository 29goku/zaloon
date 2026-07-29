"use client";

import * as React from "react";
import { History, ArrowUpCircle, ArrowDownCircle, SlidersHorizontal, ChevronDown } from "lucide-react";
import { getItemTransactionHistory } from "@/app/actions/inventory";

interface Transaction {
  id: string;
  type: string;
  quantity: number;
  note: string | null;
  createdAt: Date;
}

interface StockHistoryProps {
  itemId: string;
  itemName: string;
}

const TYPE_CONFIG = {
  IN: {
    label: "Restock",
    icon: ArrowUpCircle,
    className: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10",
  },
  OUT: {
    label: "Sale / Out",
    icon: ArrowDownCircle,
    className: "text-rose-600 dark:text-rose-400",
    bgClass: "bg-rose-500/10",
  },
  ADJUSTMENT: {
    label: "Adjustment",
    icon: SlidersHorizontal,
    className: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/10",
  },
} as const;

function formatNote(note: string | null): string | null {
  if (!note) return null;
  // Strip internal prefixes like "SALE|invoice:xxx"
  if (note.startsWith("SALE|")) return "Retail sale";
  if (note.startsWith("PO received|")) return "Purchase order received";
  return note;
}

export function StockHistory({ itemId, itemName }: StockHistoryProps) {
  const [open, setOpen] = React.useState(false);
  const [transactions, setTransactions] = React.useState<Transaction[] | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function loadHistory() {
    if (transactions !== null) {
      setOpen((v) => !v);
      return;
    }
    setOpen(true);
    setLoading(true);
    const data = await getItemTransactionHistory(itemId, 10);
    // Convert Date objects (they come as serialized from server action)
    setTransactions(
      data.map((t) => ({
        ...t,
        createdAt: new Date(t.createdAt),
      }))
    );
    setLoading(false);
  }

  const config = (type: string) =>
    TYPE_CONFIG[type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.ADJUSTMENT;

  return (
    <div className="border-t border-border mt-4 pt-4">
      <button
        onClick={loadHistory}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-left"
      >
        <History className="w-4 h-4" />
        Stock History
        <ChevronDown
          className={`w-3.5 h-3.5 ml-auto transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-3 justify-center">
              <div className="w-3.5 h-3.5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
              Loading history…
            </div>
          )}

          {!loading && transactions !== null && transactions.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">
              No transactions recorded yet for {itemName}.
            </p>
          )}

          {!loading && transactions !== null && transactions.length > 0 && (
            <div className="flex flex-col gap-2">
              {transactions.map((tx) => {
                const cfg = config(tx.type);
                const Icon = cfg.icon;
                const note = formatNote(tx.note);

                return (
                  <div
                    key={tx.id}
                    className="flex items-start gap-3 rounded-lg bg-secondary/40 px-3 py-2 text-xs"
                  >
                    <div className={`w-6 h-6 rounded-full ${cfg.bgClass} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon className={`w-3.5 h-3.5 ${cfg.className}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-semibold ${cfg.className}`}>{cfg.label}</span>
                        <span className="text-muted-foreground tabular-nums flex-shrink-0">
                          {tx.createdAt.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`font-bold tabular-nums ${
                            tx.quantity > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {tx.quantity > 0 ? "+" : ""}{tx.quantity}
                        </span>
                        {note && (
                          <span className="text-muted-foreground truncate">{note}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
