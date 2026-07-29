"use client";

import { useState } from "react";
import { DownloadButton } from "@/components/export/download-button";
import {
  exportClients,
  exportAppointments,
  exportRevenue,
  exportExpenses,
  exportInventory,
  exportPayroll,
  exportStaff,
} from "@/app/actions/export";

// ── Helpers ────────────────────────────────────────────────────────────────────

function defaultFrom(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
}

function defaultTo(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-3">{children}</div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-border" />;
}

// ── Export Hub ─────────────────────────────────────────────────────────────────

export function ExportHub() {
  // Clients
  const [clientSince, setClientSince] = useState(defaultFrom());

  // Appointments
  const [apptFrom, setApptFrom] = useState(defaultFrom());
  const [apptTo, setApptTo] = useState(defaultTo());
  const [apptStatus, setApptStatus] = useState("ALL");

  // Revenue / Expenses
  const [revFrom, setRevFrom] = useState(defaultFrom());
  const [revTo, setRevTo] = useState(defaultTo());

  const [expFrom, setExpFrom] = useState(defaultFrom());
  const [expTo, setExpTo] = useState(defaultTo());

  // Payroll
  const [payFrom, setPayFrom] = useState(defaultFrom());
  const [payTo, setPayTo] = useState(defaultTo());

  // Inventory transactions
  const [invTxFrom, setInvTxFrom] = useState(defaultFrom());
  const [invTxTo, setInvTxTo] = useState(defaultTo());

  return (
    <div className="space-y-6">
      {/* ── Clients ──────────────────────────────────────────────────────── */}
      <Section title="Clients">
        <Row>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">All clients including loyalty points, total visits and spend.</p>
          </div>
          <DownloadButton
            label="All Clients"
            action={() => exportClients()}
          />
          <DownloadButton
            label="VIP Clients"
            action={() => exportClients({ vipOnly: true })}
          />
        </Row>
        <Divider />
        <Row>
          <DateField
            label="New clients since"
            value={clientSince}
            onChange={setClientSince}
          />
          <DownloadButton
            label="New Clients"
            action={() => exportClients({ since: clientSince })}
          />
        </Row>
      </Section>

      {/* ── Appointments ─────────────────────────────────────────────────── */}
      <Section title="Appointments">
        <Row>
          <DateField label="From" value={apptFrom} onChange={setApptFrom} />
          <DateField label="To" value={apptTo} onChange={setApptTo} />
          <SelectField
            label="Status"
            value={apptStatus}
            onChange={setApptStatus}
            options={[
              { label: "All statuses", value: "ALL" },
              { label: "Completed", value: "COMPLETED" },
              { label: "Scheduled", value: "SCHEDULED" },
              { label: "Cancelled", value: "CANCELLED" },
              { label: "No-show", value: "NO_SHOW" },
            ]}
          />
          <DownloadButton
            label="Download CSV"
            action={() =>
              exportAppointments({ from: apptFrom, to: apptTo, status: apptStatus })
            }
          />
        </Row>
      </Section>

      {/* ── Financial ────────────────────────────────────────────────────── */}
      <Section title="Financial">
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Revenue</p>
          <Row>
            <DateField label="From" value={revFrom} onChange={setRevFrom} />
            <DateField label="To" value={revTo} onChange={setRevTo} />
            <DownloadButton
              label="Revenue Report"
              action={() => exportRevenue({ from: revFrom, to: revTo })}
            />
          </Row>
        </div>
        <Divider />
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expenses</p>
          <Row>
            <DateField label="From" value={expFrom} onChange={setExpFrom} />
            <DateField label="To" value={expTo} onChange={setExpTo} />
            <DownloadButton
              label="Expenses Report"
              action={() => exportExpenses({ from: expFrom, to: expTo })}
            />
          </Row>
        </div>
      </Section>

      {/* ── Staff ────────────────────────────────────────────────────────── */}
      <Section title="Staff">
        <Row>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">Staff list with commission rates and assigned services.</p>
          </div>
          <DownloadButton
            label="Staff List"
            action={() => exportStaff()}
          />
        </Row>
        <Divider />
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payroll summary</p>
          <Row>
            <DateField label="From" value={payFrom} onChange={setPayFrom} />
            <DateField label="To" value={payTo} onChange={setPayTo} />
            <DownloadButton
              label="Payroll Summary"
              action={() => exportPayroll({ from: payFrom, to: payTo })}
            />
          </Row>
        </div>
      </Section>

      {/* ── Inventory ────────────────────────────────────────────────────── */}
      <Section title="Inventory">
        <Row>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">Full inventory snapshot with cost, sale price and stock value.</p>
          </div>
          <DownloadButton
            label="Full Inventory"
            action={() => exportInventory()}
          />
          <DownloadButton
            label="Low Stock"
            action={() => exportInventory({ lowStockOnly: true })}
          />
        </Row>
        <Divider />
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transaction history</p>
          <Row>
            <DateField label="From" value={invTxFrom} onChange={setInvTxFrom} />
            <DateField label="To" value={invTxTo} onChange={setInvTxTo} />
            <DownloadButton
              label="Transactions"
              action={() =>
                exportInventory({
                  includeTransactions: true,
                  from: invTxFrom,
                  to: invTxTo,
                })
              }
            />
          </Row>
        </div>
      </Section>
    </div>
  );
}
