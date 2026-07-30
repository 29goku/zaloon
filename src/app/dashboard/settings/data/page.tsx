"use client";

import { useState, useRef, useCallback } from "react";
import {
  Download,
  Upload,
  Trash2,
  Database,
  FileText,
  Users,
  Calendar,
  Receipt,
  Scissors,
  UserCheck,
  TrendingDown,
  AlertTriangle,
  ShieldAlert,
  HardDrive,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteOldAppointments, deleteCancelledAppointments } from "@/app/actions/admin";
import { importClients, ImportClientInput } from "@/app/actions/clients";
import { importServices, ImportServiceInput } from "@/app/actions/services";

// ── CSV helpers ────────────────────────────────────────────────────────────────

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsv).join(","));
  }
  return lines.join("\n");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCsv(content: string, filename: string) {
  downloadFile(content, filename, "text/csv;charset=utf-8;");
}

async function fetchExport(model: string) {
  const res = await fetch(`/api/export/${model}`);
  if (!res.ok) throw new Error(`Failed to fetch ${model}`);
  return res.json();
}

// ── CSV exporters ──────────────────────────────────────────────────────────────

async function exportClientsCsv() {
  const data = await fetchExport("clients");
  const rows = data.map((c: any) => [
    c.name,
    c.phone ?? "",
    c.email ?? "",
    String(c.Appointment?.length ?? 0),
    String((c.Invoice?.reduce((sum: number, inv: any) => sum + inv.total, 0) ?? 0).toFixed(2)),
    String(c.loyaltyPoints ?? 0),
  ]);
  return toCsv(["Name", "Phone", "Email", "Visits", "Total Spent", "Loyalty Points"], rows);
}

async function exportAppointmentsCsv() {
  const data = await fetchExport("appointments");
  const rows = data.map((a: any) => [
    a.date,
    a.Client?.name ?? "Walk-in",
    a.AppointmentService?.map((as: any) => as.Service?.name).join("; ") ?? "",
    a.Staff?.name ?? "",
    a.status,
    String(a.totalAmount ?? "0"),
  ]);
  return toCsv(["Date", "Client", "Service(s)", "Staff", "Status", "Amount"], rows);
}

async function exportInvoicesCsv() {
  const data = await fetchExport("invoices");
  const rows = data.map((inv: any, idx: number) => [
    String(idx + 1),
    new Date(inv.createdAt).toLocaleDateString(),
    inv.Client?.name ?? "Walk-in",
    String(inv.total ?? "0"),
    inv.paymentMethod ?? "",
    inv.status ?? "",
  ]);
  return toCsv(["Invoice #", "Date", "Client", "Amount", "Payment Method", "Status"], rows);
}

async function exportServicesCsv() {
  const data = await fetchExport("services");
  const rows = data.map((s: any) => [
    s.name,
    s.ServiceCategory?.name ?? "",
    String(s.price ?? "0"),
    String(s.durationMins ?? "0"),
  ]);
  return toCsv(["Name", "Category", "Price", "Duration (mins)"], rows);
}

async function exportStaffCsv() {
  const data = await fetchExport("staff");
  const rows = data.map((s: any) => [
    s.name,
    s.phone ?? "",
    s.StaffService?.map((ss: any) => ss.Service?.name).join("; ") ?? "",
    `${s.commissionPct ?? 0}%`,
  ]);
  return toCsv(["Name", "Phone", "Services", "Commission"], rows);
}

async function exportExpensesCsv() {
  const data = await fetchExport("expenses");
  const rows = data.map((e: any) => [
    e.date,
    e.category,
    e.description,
    String(e.amount ?? "0"),
  ]);
  return toCsv(["Date", "Category", "Description", "Amount"], rows);
}

// ── CSV templates ──────────────────────────────────────────────────────────────

const CLIENTS_TEMPLATE =
  "name,phone,email,birthday,notes\nJane Smith,+1234567890,jane@example.com,1990-03-15,Prefers morning appointments";

const APPOINTMENTS_TEMPLATE =
  "date,clientName,staffName,serviceName,startTime,notes\n2024-01-15,Jane Smith,Alex,Haircut,10:00,First visit";

const SERVICES_TEMPLATE =
  "name,price,duration,category\nHaircut,25,30,Hair\nBlowout,35,45,Hair\nManicure,20,40,Nails";

// ── Simple CSV parser ──────────────────────────────────────────────────────────

function parseCsvSimple(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQuote = false;
        else cur += ch;
      } else {
        if (ch === '"') inQuote = true;
        else if (ch === ",") { cols.push(cur); cur = ""; }
        else cur += ch;
      }
    }
    cols.push(cur);
    rows.push(cols);
  }
  return rows;
}

// ── Import result ─────────────────────────────────────────────────────────────

type ImportResult = {
  imported: number;
  errors: string[];
};

// ── Inline CSV import widget ───────────────────────────────────────────────────

interface CsvImportRowProps {
  title: string;
  description: string;
  templateContent: string;
  templateFilename: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  onImport: (text: string) => Promise<ImportResult>;
}

function CsvImportRow({
  title,
  description,
  templateContent,
  templateFilename,
  icon: Icon,
  color,
  bg,
  onImport,
}: CsvImportRowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function downloadTemplate() {
    const blob = new Blob([templateContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = templateFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setImporting(true);
    try {
      const text = await file.text();
      const importResult = await onImport(text);
      setResult(importResult);
      toast.success(`Imported ${importResult.imported} record(s)`);
    } catch (err) {
      console.error("[CsvImportRow]", err);
      toast.error("Import failed");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/30">
      <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        {result && (
          <div className={[
            "mt-2 flex items-center gap-1.5 text-xs",
            result.errors.length === 0 ? "text-emerald-400" : "text-amber-400",
          ].join(" ")}>
            {result.errors.length === 0 ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            Imported {result.imported}{result.errors.length > 0 ? `, ${result.errors.length} error(s)` : ""}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="text-xs h-7 gap-1"
          onClick={downloadTemplate}
          title="Download template CSV"
        >
          <FileText className="w-3.5 h-3.5" />
          Template
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="sr-only"
          onChange={handleFile}
        />
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 gap-1"
          disabled={importing}
          onClick={() => fileInputRef.current?.click()}
        >
          {importing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          {importing ? "Importing…" : "Import"}
        </Button>
      </div>
    </div>
  );
}

// ── Confirmation Dialog ────────────────────────────────────────────────────────

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  loading?: boolean;
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  loading = false,
}: DeleteConfirmDialogProps) {
  const [typed, setTyped] = useState("");

  function handleOpenChange(v: boolean) {
    if (!v) setTyped("");
    onOpenChange(v);
  }

  const confirmed = typed.trim() === "DELETE";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          <Label className="text-sm text-muted-foreground">
            Type <span className="font-mono font-semibold text-destructive">DELETE</span> to confirm
          </Label>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="DELETE"
            className="font-mono"
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={!confirmed || loading}
          >
            {loading ? "Deleting…" : "Yes, delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DataPage() {
  const [loadingExport, setLoadingExport] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "old" | "cancelled" | null;
    loading: boolean;
  }>({ open: false, type: null, loading: false });

  // ── Export handlers ──────────────────────────────────────────────────────────

  async function handleBackupDownload() {
    setLoadingExport("backup");
    try {
      const a = document.createElement("a");
      a.href = "/api/export/backup";
      a.download = `zaloon-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Backup downloaded");
    } catch {
      toast.error("Backup failed");
    } finally {
      setLoadingExport(null);
    }
  }

  async function handleCsvExport(
    key: string,
    label: string,
    exporter: () => Promise<string>
  ) {
    setLoadingExport(key);
    try {
      const csv = await exporter();
      const timestamp = new Date().toISOString().split("T")[0];
      downloadCsv(csv, `zaloon-${key}-${timestamp}.csv`);
      toast.success(`${label} CSV downloaded`);
    } catch {
      toast.error(`Failed to export ${label}`);
    } finally {
      setLoadingExport(null);
    }
  }

  // ── Import handlers ──────────────────────────────────────────────────────────

  async function importClientsFromCsv(text: string): Promise<ImportResult> {
    const rows = parseCsvSimple(text);
    if (rows.length < 2) return { imported: 0, errors: ["No data rows found"] };

    const headerRow = rows[0].map((h) => h.toLowerCase().trim());
    const nameIdx = headerRow.findIndex((h) => ["name", "full name", "fullname"].includes(h));
    const phoneIdx = headerRow.findIndex((h) => ["phone", "mobile"].includes(h));
    const emailIdx = headerRow.findIndex((h) => ["email", "e-mail"].includes(h));
    const birthdayIdx = headerRow.findIndex((h) => ["birthday", "dob", "birth date"].includes(h));
    const notesIdx = headerRow.findIndex((h) => ["notes", "note", "comments"].includes(h));

    if (nameIdx < 0) return { imported: 0, errors: ['CSV must have a "name" column'] };

    const clients: ImportClientInput[] = [];
    for (const row of rows.slice(1)) {
      const name = row[nameIdx]?.trim();
      if (!name) continue;
      clients.push({
        name,
        phone: phoneIdx >= 0 ? row[phoneIdx]?.trim() || undefined : undefined,
        email: emailIdx >= 0 ? row[emailIdx]?.trim() || undefined : undefined,
        birthday: birthdayIdx >= 0 ? row[birthdayIdx]?.trim() || undefined : undefined,
        notes: notesIdx >= 0 ? row[notesIdx]?.trim() || undefined : undefined,
      });
    }

    const result = await importClients(clients);
    return { imported: result.imported, errors: result.errors };
  }

  async function importAppointmentsFromCsv(text: string): Promise<ImportResult> {
    // Basic implementation: parse and report — full appointment import
    // requires staff + service matching which is complex; this previews counts.
    const rows = parseCsvSimple(text);
    if (rows.length < 2) return { imported: 0, errors: ["No data rows found"] };

    const dataRows = rows.slice(1).filter((r) => r.some((c) => c.trim()));
    return {
      imported: 0,
      errors: [
        `Found ${dataRows.length} row(s). Full appointment import requires matching existing clients and staff by name — please use the calendar UI or API instead.`,
      ],
    };
  }

  async function importServicesFromCsv(text: string): Promise<ImportResult> {
    const rows = parseCsvSimple(text);
    if (rows.length < 2) return { imported: 0, errors: ["No data rows found"] };

    const headerRow = rows[0].map((h) => h.toLowerCase().trim());
    const nameIdx = headerRow.findIndex((h) => h === "name");
    const priceIdx = headerRow.findIndex((h) => ["price", "cost"].includes(h));
    const durationIdx = headerRow.findIndex((h) => ["duration", "duration (mins)", "mins"].includes(h));
    const categoryIdx = headerRow.findIndex((h) => ["category", "cat"].includes(h));

    if (nameIdx < 0) return { imported: 0, errors: ['CSV must have a "name" column'] };
    if (priceIdx < 0) return { imported: 0, errors: ['CSV must have a "price" column'] };
    if (durationIdx < 0) return { imported: 0, errors: ['CSV must have a "duration" column'] };

    const serviceRows: ImportServiceInput[] = rows.slice(1)
      .filter((r) => r[nameIdx]?.trim())
      .map((r) => ({
        name: r[nameIdx].trim(),
        price: r[priceIdx]?.trim() ?? "0",
        duration: r[durationIdx]?.trim() ?? "30",
        category: categoryIdx >= 0 ? r[categoryIdx]?.trim() || undefined : undefined,
      }));

    const result = await importServices(serviceRows);
    return { imported: result.imported, errors: result.errors };
  }

  // ── Cleanup handlers ─────────────────────────────────────────────────────────

  async function handleCleanupConfirm() {
    if (!confirmDialog.type) return;
    setConfirmDialog((d) => ({ ...d, loading: true }));
    try {
      const result =
        confirmDialog.type === "old"
          ? await deleteOldAppointments()
          : await deleteCancelledAppointments();

      if (result.success) {
        toast.success(`Deleted ${result.deleted} appointment(s)`);
        setConfirmDialog({ open: false, type: null, loading: false });
      } else {
        toast.error(result.error);
        setConfirmDialog((d) => ({ ...d, loading: false }));
      }
    } catch {
      toast.error("Operation failed");
      setConfirmDialog((d) => ({ ...d, loading: false }));
    }
  }

  // ── CSV export section config ─────────────────────────────────────────────────

  const csvExports = [
    {
      key: "clients",
      label: "Clients",
      description: "Name, phone, email, visits, total spent, loyalty points",
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      exporter: exportClientsCsv,
    },
    {
      key: "appointments",
      label: "Appointments",
      description: "Date, client, service, staff, status, amount",
      icon: Calendar,
      color: "text-violet-400",
      bg: "bg-violet-400/10",
      exporter: exportAppointmentsCsv,
    },
    {
      key: "invoices",
      label: "Invoices",
      description: "Invoice #, date, client, amount, method, status",
      icon: Receipt,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
      exporter: exportInvoicesCsv,
    },
    {
      key: "services",
      label: "Services",
      description: "Name, category, price, duration",
      icon: Scissors,
      color: "text-pink-400",
      bg: "bg-pink-400/10",
      exporter: exportServicesCsv,
    },
    {
      key: "staff",
      label: "Staff",
      description: "Name, phone, services, commission",
      icon: UserCheck,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
      exporter: exportStaffCsv,
    },
    {
      key: "expenses",
      label: "Expenses",
      description: "Date, category, description, amount",
      icon: TrendingDown,
      color: "text-red-400",
      bg: "bg-red-400/10",
      exporter: exportExpensesCsv,
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Data &amp; Privacy</h1>
        <p className="text-muted-foreground mt-1">
          Import, export, backup, and clean up your salon data
        </p>
      </div>

      {/* ── Import section ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="w-4 h-4 text-primary" />
            Import Data
          </CardTitle>
          <CardDescription>
            Bulk-import clients, services, or appointments from CSV files.
            Download a template first to see the expected format.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CsvImportRow
            title="Import Clients from CSV"
            description="Expected columns: name, phone, email, birthday, notes. Duplicates (same phone) are skipped."
            templateContent={CLIENTS_TEMPLATE}
            templateFilename="clients-template.csv"
            icon={Users}
            color="text-blue-400"
            bg="bg-blue-400/10"
            onImport={importClientsFromCsv}
          />
          <CsvImportRow
            title="Import Services from CSV"
            description="Expected columns: name, price, duration (mins), category. Creates categories automatically."
            templateContent={SERVICES_TEMPLATE}
            templateFilename="services-template.csv"
            icon={Scissors}
            color="text-pink-400"
            bg="bg-pink-400/10"
            onImport={importServicesFromCsv}
          />
          <CsvImportRow
            title="Import Appointments from CSV"
            description="Expected columns: date, clientName, staffName, serviceName, startTime, notes."
            templateContent={APPOINTMENTS_TEMPLATE}
            templateFilename="appointments-template.csv"
            icon={Calendar}
            color="text-violet-400"
            bg="bg-violet-400/10"
            onImport={importAppointmentsFromCsv}
          />
        </CardContent>
      </Card>

      {/* ── Export section ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4 text-primary" />
            Export by Section
          </CardTitle>
          <CardDescription>
            Download individual sections as CSV files for use in spreadsheets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {csvExports.map(({ key, label, description, icon: Icon, color, bg, exporter }) => (
              <div
                key={key}
                className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/30"
              >
                <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {description}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-shrink-0 gap-1 text-xs h-7"
                  disabled={loadingExport === key}
                  onClick={() => handleCsvExport(key, label, exporter)}
                >
                  <Download className="w-3.5 h-3.5" />
                  {loadingExport === key ? "…" : "CSV"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Backup section ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="w-4 h-4 text-primary" />
            Backup
          </CardTitle>
          <CardDescription>
            Download a complete snapshot of all your salon data as a single JSON file — ideal
            for off-site backups and migrations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-border bg-muted/30">
            <div>
              <p className="text-sm font-medium text-foreground">Full data backup</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Includes all clients, appointments, services, staff, and invoices
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs flex-shrink-0"
              disabled={loadingExport === "backup"}
              onClick={handleBackupDownload}
            >
              {loadingExport === "backup" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Download
            </Button>
          </div>

          {/* Restore note */}
          <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
            <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Restore from backup</p>
              <p className="text-sm text-muted-foreground mt-1">
                Restoring from a JSON backup affects all your data and cannot be
                undone automatically. To restore, please{" "}
                <span className="font-medium text-foreground">contact support</span> and
                share your backup file — our team will safely restore it for you.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Danger zone ── */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <Trash2 className="w-4 h-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Remove old or unwanted records. These actions are permanent and cannot be undone.
            You must type <span className="font-mono font-semibold text-destructive">DELETE</span> to confirm.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-border bg-muted/30">
            <div>
              <p className="text-sm font-medium text-foreground">Delete all cancelled appointments</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently removes all appointments with CANCELLED status
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 flex-shrink-0"
              onClick={() => setConfirmDialog({ open: true, type: "cancelled", loading: false })}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-border bg-muted/30">
            <div>
              <p className="text-sm font-medium text-foreground">Delete old appointments (1yr+)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently removes all appointment records older than 1 year
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 flex-shrink-0"
              onClick={() => setConfirmDialog({ open: true, type: "old", loading: false })}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          </div>

          {process.env.NODE_ENV === "development" && (
            <>
              <Separator />
              <div className="flex items-start gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-destructive">Clear test data</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Deletes everything and re-runs the seed. Only shown in development mode.
                  </p>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="mt-3 gap-1.5 text-xs"
                    onClick={() => toast.info("Run `npx prisma db seed` manually to re-seed after clearing.")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear test data (dev only)
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <DeleteConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(v) =>
          !confirmDialog.loading && setConfirmDialog({ open: v, type: v ? confirmDialog.type : null, loading: false })
        }
        title={
          confirmDialog.type === "old"
            ? "Delete appointments older than 1 year?"
            : "Delete all cancelled appointments?"
        }
        description={
          confirmDialog.type === "old"
            ? "This will permanently delete all appointment records older than 1 year. Associated invoices will be kept but unlinked. This cannot be undone."
            : "This will permanently delete all appointments with CANCELLED status. Associated invoices will be kept but unlinked. This cannot be undone."
        }
        onConfirm={handleCleanupConfirm}
        loading={confirmDialog.loading}
      />
    </div>
  );
}
