"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Loader2,
  FileText,
  X,
  AlertCircle,
  Download,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { ImportClientsDialog } from "@/components/clients/import-clients-dialog";
import { importServices } from "@/app/actions/import";
import { parseCSV } from "@/lib/csv";

// ── Templates ─────────────────────────────────────────────────────────────────

const SERVICES_TEMPLATE =
  "name,category,duration,price\nHaircut,Hair,30,35\nColour,Hair,90,120\nMassage,Wellness,60,80";

function downloadTemplate(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Services import ────────────────────────────────────────────────────────────

type ServiceRow = {
  name: string;
  category: string;
  duration: string;
  price: string;
};

function ImportServicesPanel() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ServiceRow[]>([]);
  const [allRows, setAllRows] = useState<ServiceRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    errors: string[];
  } | null>(null);

  function reset() {
    setFileName(null);
    setPreview([]);
    setAllRows([]);
    setParseError(null);
    setImporting(false);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function processFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      setParseError("Please select a .csv file.");
      return;
    }
    setFileName(file.name);
    setParseError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const rows = parseCSV(text) as ServiceRow[];
        if (rows.length === 0) {
          setParseError("CSV is empty or has no data rows.");
          return;
        }
        // Validate required columns
        const first = rows[0];
        const missing: string[] = [];
        if (!("name" in first)) missing.push("name");
        if (!("category" in first)) missing.push("category");
        if (!("duration" in first)) missing.push("duration");
        if (!("price" in first)) missing.push("price");
        if (missing.length > 0) {
          setParseError(
            `Missing required column(s): ${missing.join(", ")}. Check the template.`
          );
          return;
        }
        setAllRows(rows);
        setPreview(rows.slice(0, 5));
      } catch {
        setParseError("Failed to parse CSV — please check the file format.");
      }
    };
    reader.readAsText(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  async function handleImport() {
    if (!allRows.length || importing) return;
    setImporting(true);
    try {
      const res = await importServices(allRows);
      setResult({ imported: res.imported, errors: res.errors });
      toast.success(
        `Imported ${res.imported} service${res.imported !== 1 ? "s" : ""}`,
        res.errors.length > 0
          ? `${res.errors.length} row${res.errors.length !== 1 ? "s" : ""} had errors`
          : undefined
      );
      router.refresh();
    } catch {
      toast.error("Import failed", "An unexpected error occurred.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Template download */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
        <p className="text-xs text-muted-foreground">
          Download the template CSV — required columns: name, category, duration (mins), price.
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="gap-1.5 text-xs h-7 flex-shrink-0"
          onClick={() => downloadTemplate("services-template.csv", SERVICES_TEMPLATE)}
        >
          <Download className="w-3.5 h-3.5" />
          Template
        </Button>
      </div>

      {/* Drop zone */}
      {!fileName ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => fileRef.current?.click()}
          className={[
            "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
            dragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40",
          ].join(" ")}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={handleFileChange}
          />
          <Upload className="w-8 h-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Drag and drop a CSV file here
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              or click to browse — columns: name, category, duration, price
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <FileText className="w-4 h-4 text-primary" />
            <span className="font-medium">{fileName}</span>
            <span className="text-muted-foreground">— {allRows.length} row{allRows.length !== 1 ? "s" : ""}</span>
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Parse error */}
      {parseError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {parseError}
        </div>
      )}

      {/* Preview table */}
      {preview.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Preview ({allRows.length} service{allRows.length !== 1 ? "s" : ""})
            {allRows.length > 5 && (
              <span className="text-muted-foreground font-normal"> — showing first 5</span>
            )}
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {["Name", "Category", "Duration (mins)", "Price"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2 text-foreground">{row.name}</td>
                    <td className="px-3 py-2 text-foreground">{row.category}</td>
                    <td className="px-3 py-2 text-foreground">{row.duration}</td>
                    <td className="px-3 py-2 text-foreground">{row.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Result banner */}
      {result && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Imported {result.imported} service{result.imported !== 1 ? "s" : ""}
            {result.errors.length > 0 && (
              <span className="text-amber-400 ml-1">
                ({result.errors.length} error{result.errors.length !== 1 ? "s" : ""})
              </span>
            )}
          </div>
          {result.errors.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 space-y-1 max-h-40 overflow-y-auto">
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  {e}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {allRows.length > 0 && !result && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={reset}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleImport} disabled={importing}>
            {importing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Importing…
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                Import {allRows.length} service{allRows.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main hub ──────────────────────────────────────────────────────────────────

export function ImportHub() {
  return (
    <div className="space-y-6">
      <Section
        title="Clients"
        description="Import clients from a CSV file. Supports column auto-detection and manual mapping."
      >
        <div className="flex flex-wrap items-center gap-3">
          <ImportClientsDialog />
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() =>
              downloadTemplate(
                "clients-template.csv",
                "name,phone,email,birthday,notes\nJane Smith,+1234567890,jane@example.com,1990-03-15,Prefers morning appointments"
              )
            }
          >
            <Download className="w-3.5 h-3.5" />
            Client Template
          </Button>
        </div>
      </Section>

      <Section
        title="Services"
        description="Import services in bulk. Categories will be created automatically if they don't exist."
      >
        <ImportServicesPanel />
      </Section>
    </div>
  );
}
