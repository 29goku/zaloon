"use client";

import { useState } from "react";
import { QuickPayForm } from "./quick-pay-form";
import { RecentPayments } from "./recent-payments";
import type { RecentInvoice } from "@/app/dashboard/quick-pay/page";
import type { CreatedInvoice } from "@/app/actions/payments";

interface Props {
  initialInvoices: RecentInvoice[];
}

export function QuickPayContainer({ initialInvoices }: Props) {
  const [invoices, setInvoices] = useState<RecentInvoice[]>(initialInvoices);

  const handlePaymentCreated = (invoice: CreatedInvoice) => {
    setInvoices((prev) => [invoice, ...prev].slice(0, 10));
  };

  return (
    <div className="space-y-6">
      <QuickPayForm onPaymentCreated={handlePaymentCreated} />
      <RecentPayments invoices={invoices} />
    </div>
  );
}
