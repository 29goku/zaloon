"use client";

import { useState } from "react";
import { QuickPayForm } from "./quick-pay-form";
import { RecentPayments } from "./recent-payments";
import type { RecentInvoice, ServiceOption } from "@/app/dashboard/quick-pay/page";
import type { CreatedInvoice } from "@/app/actions/payments";

interface Props {
  initialInvoices: RecentInvoice[];
  services: ServiceOption[];
}

export function QuickPayContainer({ initialInvoices, services }: Props) {
  const [invoices, setInvoices] = useState<RecentInvoice[]>(initialInvoices);

  const handlePaymentCreated = (invoice: CreatedInvoice) => {
    setInvoices((prev) =>
      [
        {
          id: invoice.id,
          total: invoice.total,
          paymentMethod: invoice.paymentMethod,
          note: invoice.note,
          createdAt: invoice.createdAt,
          clientName: invoice.clientName,
        },
        ...prev,
      ].slice(0, 10)
    );
  };

  return (
    <div className="space-y-6">
      <QuickPayForm services={services} onPaymentCreated={handlePaymentCreated} />
      <RecentPayments invoices={invoices} />
    </div>
  );
}
