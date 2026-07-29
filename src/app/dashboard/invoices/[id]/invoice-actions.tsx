"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Copy, Printer } from "lucide-react";
import { voidInvoice, createInvoice } from "@/app/actions/invoices";

interface Props {
  invoiceId: string;
  status: string;
  /** Pre-populated data for duplicate */
  duplicateData: {
    salonId: string;
    clientId?: string;
    total: number;
    paymentMethod: string;
    items: { name: string; price: number }[];
  };
}

export function InvoiceActions({ invoiceId, status, duplicateData }: Props) {
  const router = useRouter();
  const [voiding, startVoid] = useTransition();
  const [duplicating, startDuplicate] = useTransition();

  const isVoid = status === "VOID";

  function handleVoid() {
    if (!confirm("Are you sure you want to void this invoice? This cannot be undone.")) return;
    startVoid(async () => {
      const result = await voidInvoice(invoiceId);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error ?? "Failed to void invoice.");
      }
    });
  }

  function handleDuplicate() {
    startDuplicate(async () => {
      const result = await createInvoice(duplicateData);
      if (result.success) {
        router.push(`/dashboard/invoices/${result.id}`);
      } else {
        alert(result.error ?? "Failed to duplicate invoice.");
      }
    });
  }

  return (
    <div className="flex justify-center gap-3 pb-16 no-print flex-wrap">
      {/* Print Invoice — full A4 layout */}
      <a
        href={`/dashboard/invoices/${invoiceId}/print`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 border border-border text-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-secondary/60 transition-colors shadow-sm"
      >
        <Printer className="w-4 h-4" />
        Print Invoice
      </a>

      {/* Print Receipt — compact thermal layout */}
      <a
        href={`/dashboard/invoices/${invoiceId}/receipt`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 border border-border text-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-secondary/60 transition-colors shadow-sm"
      >
        <Printer className="w-4 h-4" />
        Print Receipt
      </a>

      {/* Duplicate */}
      <button
        onClick={handleDuplicate}
        disabled={duplicating}
        className="flex items-center gap-2 border border-border text-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-secondary/60 transition-colors shadow-sm disabled:opacity-50"
      >
        <Copy className="w-4 h-4" />
        {duplicating ? "Duplicating…" : "Duplicate"}
      </button>

      {/* Void */}
      {!isVoid && (
        <button
          onClick={handleVoid}
          disabled={voiding}
          className="flex items-center gap-2 border border-[#F41666]/50 text-[#F41666] px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#F41666]/10 transition-colors shadow-sm disabled:opacity-50"
        >
          <Ban className="w-4 h-4" />
          {voiding ? "Voiding…" : "Void Invoice"}
        </button>
      )}
    </div>
  );
}
