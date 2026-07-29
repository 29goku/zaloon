"use client";

import { RecentInvoice } from "@/app/dashboard/quick-pay/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  UPI: "UPI",
  TRANSFER: "Transfer",
};

interface Props {
  invoices: RecentInvoice[];
}

export function RecentPayments({ invoices }: Props) {
  if (invoices.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No quick payments yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base">Recent Payments</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {invoices.map((inv) => (
            <li key={inv.id} className="flex items-center justify-between px-6 py-3 gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {inv.clientName ?? "Walk-in"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {METHOD_LABELS[inv.paymentMethod] ?? inv.paymentMethod}
                  {inv.note ? ` · ${inv.note}` : ""}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-foreground">${inv.total.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(inv.createdAt), { addSuffix: true })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
