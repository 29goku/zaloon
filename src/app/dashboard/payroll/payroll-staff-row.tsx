"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { MarkPaidButton } from "./mark-paid-button";
import Link from "next/link";

interface ServiceBreakdown {
  serviceId: string;
  serviceName: string;
  count: number;
  revenue: number;
  commissionPct: number;
  commission: number;
}

interface PayrollStaffRowProps {
  staffId: string;
  staffName: string;
  initials: string;
  from: string;
  to: string;
  appointmentCount: number;
  revenue: number;
  commissionPct: number;
  commissionEarned: number;
  tips: number;
  netPay: number;
  alreadyPaid: boolean;
  services: ServiceBreakdown[];
}

export function PayrollStaffRow({
  staffId,
  staffName,
  initials,
  from,
  to,
  appointmentCount,
  revenue,
  commissionPct,
  commissionEarned,
  tips,
  netPay,
  alreadyPaid,
  services,
}: PayrollStaffRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="border-b border-border hover:bg-muted/30 transition-colors">
        {/* Expand toggle + name */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              aria-label={expanded ? "Collapse breakdown" : "Expand breakdown"}
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
              {initials}
            </div>
            <Link
              href={`/dashboard/payroll/${staffId}?from=${from}&to=${to}`}
              className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              {staffName}
              <ExternalLink className="w-3 h-3 opacity-40" />
            </Link>
          </div>
        </td>
        <td className="px-4 py-3 text-right text-foreground tabular-nums">
          {appointmentCount}
        </td>
        <td className="px-4 py-3 text-right text-foreground tabular-nums">
          ${revenue.toFixed(2)}
        </td>
        <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
          {commissionPct}%
        </td>
        <td className="px-4 py-3 text-right text-foreground tabular-nums">
          ${commissionEarned.toFixed(2)}
        </td>
        <td className="px-4 py-3 text-right text-foreground tabular-nums">
          ${tips.toFixed(2)}
        </td>
        <td className="px-4 py-3 text-right font-semibold text-primary tabular-nums">
          ${netPay.toFixed(2)}
        </td>
        <td className="px-4 py-3 text-right">
          <MarkPaidButton
            staffId={staffId}
            staffName={staffName}
            from={from}
            to={to}
            commission={netPay}
            alreadyPaid={alreadyPaid}
          />
        </td>
      </tr>

      {/* Breakdown rows */}
      {expanded && services.length > 0 && (
        <>
          {/* Header sub-row */}
          <tr className="bg-muted/20 border-b border-border/50">
            <td className="pl-16 pr-4 py-2 text-xs font-semibold text-muted-foreground">
              Service
            </td>
            <td className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
              Count
            </td>
            <td className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
              Revenue
            </td>
            <td className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
              Rate
            </td>
            <td className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
              Commission
            </td>
            <td colSpan={3} />
          </tr>
          {services.map((svc) => (
            <tr
              key={svc.serviceId}
              className="bg-muted/10 border-b border-border/30 last:border-border hover:bg-muted/20 transition-colors"
            >
              <td className="pl-16 pr-4 py-2 text-xs text-foreground">
                {svc.serviceName}
              </td>
              <td className="px-4 py-2 text-right text-xs text-muted-foreground tabular-nums">
                {svc.count}
              </td>
              <td className="px-4 py-2 text-right text-xs text-foreground tabular-nums">
                ${svc.revenue.toFixed(2)}
              </td>
              <td className="px-4 py-2 text-right text-xs text-muted-foreground tabular-nums">
                {svc.commissionPct}%
              </td>
              <td className="px-4 py-2 text-right text-xs font-medium text-primary tabular-nums">
                ${svc.commission.toFixed(2)}
              </td>
              <td colSpan={3} />
            </tr>
          ))}
          {/* Subtotal row */}
          <tr className="bg-muted/30 border-b border-border">
            <td className="pl-16 pr-4 py-2 text-xs font-bold text-foreground">
              Subtotal
            </td>
            <td className="px-4 py-2 text-right text-xs font-bold text-foreground tabular-nums">
              {services.reduce((s, x) => s + x.count, 0)}
            </td>
            <td className="px-4 py-2 text-right text-xs font-bold text-foreground tabular-nums">
              ${services.reduce((s, x) => s + x.revenue, 0).toFixed(2)}
            </td>
            <td />
            <td className="px-4 py-2 text-right text-xs font-bold text-primary tabular-nums">
              ${services.reduce((s, x) => s + x.commission, 0).toFixed(2)}
            </td>
            <td colSpan={3} />
          </tr>
        </>
      )}
      {expanded && services.length === 0 && (
        <tr className="bg-muted/10 border-b border-border">
          <td
            colSpan={8}
            className="pl-16 pr-4 py-3 text-xs text-muted-foreground"
          >
            No service breakdown available for this period.
          </td>
        </tr>
      )}
    </>
  );
}
