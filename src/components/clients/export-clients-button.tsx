"use client";

import { useState } from "react";
import { Download, Loader2, FileText, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClientForSheet } from "./client-detail-sheet";

interface ExportClientsButtonProps {
  /** When provided, used as the "filtered" client set. */
  clients?: ClientForSheet[];
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

function escapeCsvField(val: string | number): string {
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function fetchAllClients(): Promise<ClientForSheet[]> {
  const response = await fetch("/api/clients/export-json");
  if (!response.ok) throw new Error("Export failed");
  return response.json();
}

// ── CSV builders ──────────────────────────────────────────────────────────────

const BASE_HEADERS = [
  "name",
  "phone",
  "email",
  "birthday",
  "anniversary",
  "notes",
  "loyaltyPoints",
  "createdAt",
] as const;

const HISTORY_HEADERS = [
  ...BASE_HEADERS,
  "totalVisits",
  "lastVisit",
  "totalSpent",
] as const;

type BaseRow = Record<(typeof BASE_HEADERS)[number], string | number>;
type HistoryRow = Record<(typeof HISTORY_HEADERS)[number], string | number>;

function buildBaseRow(c: ClientForSheet): BaseRow {
  return {
    name: c.name,
    phone: c.phone ?? "",
    email: c.email ?? "",
    birthday: formatDate(c.birthday),
    anniversary: formatDate(c.anniversary),
    notes: (c.notes ?? "").replace(/\n/g, " "),
    loyaltyPoints: c.loyaltyPoints ?? 0,
    createdAt: formatDate(c.createdAt),
  };
}

function buildHistoryRow(c: ClientForSheet): HistoryRow {
  return {
    ...buildBaseRow(c),
    totalVisits: c._count.Appointment,
    lastVisit: c.lastVisit ?? "",
    totalSpent: c.totalSpent ?? 0,
  };
}

function buildCsv<T extends Record<string, string | number>>(
  headers: readonly (keyof T & string)[],
  rows: T[]
): string {
  const header = headers.join(",");
  const body = rows
    .map((r) => headers.map((k) => escapeCsvField(r[k])).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ExportClientsButton({ clients }: ExportClientsButtonProps) {
  const [loading, setLoading] = useState<"all" | "filtered" | "history" | null>(null);

  async function exportAll() {
    if (loading) return;
    setLoading("all");
    try {
      const data = await fetchAllClients();
      const rows = data.map(buildBaseRow);
      const csv = buildCsv(BASE_HEADERS as readonly string[], rows as any);
      triggerDownload(csv, "clients-all.csv", "text/csv;charset=utf-8;");
    } catch (err) {
      console.error("CSV export error", err);
    } finally {
      setLoading(null);
    }
  }

  async function exportFiltered() {
    if (loading) return;
    setLoading("filtered");
    try {
      const data = clients ?? (await fetchAllClients());
      const rows = data.map(buildBaseRow);
      const csv = buildCsv(BASE_HEADERS as readonly string[], rows as any);
      triggerDownload(csv, "clients-filtered.csv", "text/csv;charset=utf-8;");
    } catch (err) {
      console.error("CSV export error", err);
    } finally {
      setLoading(null);
    }
  }

  async function exportWithHistory() {
    if (loading) return;
    setLoading("history");
    try {
      const data = await fetchAllClients();
      const rows = data.map(buildHistoryRow);
      const csv = buildCsv(HISTORY_HEADERS as readonly string[], rows as any);
      triggerDownload(csv, "clients-with-history.csv", "text/csv;charset=utf-8;");
    } catch (err) {
      console.error("CSV export error", err);
    } finally {
      setLoading(null);
    }
  }

  const filteredLabel = clients
    ? `Export filtered clients (${clients.length})`
    : "Export filtered clients (CSV)";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" disabled={!!loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={exportAll}>
          <FileText className="w-4 h-4" />
          Export all clients (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportFiltered}>
          <FileText className="w-4 h-4" />
          {filteredLabel}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportWithHistory}>
          <History className="w-4 h-4" />
          Export with appointment history (CSV)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
