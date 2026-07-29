"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, FileText, X, AlertCircle, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { importClients, ImportClientInput } from "@/app/actions/clients";

// ── CSV parser ────────────────────────────────────────────────────────────────

/** Minimal RFC-4180-aware CSV parser (no library needed). */
function parseCsv(text: string): string[][] {
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
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuote = false;
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') {
          inQuote = true;
        } else if (ch === ",") {
          cols.push(cur);
          cur = "";
        } else {
          cur += ch;
        }
      }
    }
    cols.push(cur);
    rows.push(cols);
  }
  return rows;
}

// ── Column mapping ────────────────────────────────────────────────────────────

const KNOWN_FIELDS = ["name", "phone", "email", "birthday", "notes"] as const;
type KnownField = (typeof KNOWN_FIELDS)[number];

const FIELD_LABELS: Record<KnownField, string> = {
  name: "Name",
  phone: "Phone",
  email: "Email",
  birthday: "Birthday",
  notes: "Notes",
};

const ALIASES: Record<KnownField, string[]> = {
  name: ["name", "full name", "fullname", "client name", "clientname"],
  phone: ["phone", "mobile", "cell", "telephone", "phone number"],
  email: ["email", "e-mail", "email address"],
  birthday: ["birthday", "birth date", "birthdate", "dob", "date of birth"],
  notes: ["notes", "note", "comments", "comment", "remarks"],
};

/** Returns a mapping from KnownField → column index (-1 if not found). */
function detectMapping(headers: string[]): Record<KnownField, number> {
  const mapping = {} as Record<KnownField, number>;
  for (const field of KNOWN_FIELDS) {
    const idx = headers.findIndex((h) =>
      ALIASES[field].includes(h.toLowerCase().trim())
    );
    mapping[field] = idx; // -1 if not found
  }
  return mapping;
}

function rowToClient(
  row: string[],
  mapping: Record<KnownField, number>
): ImportClientInput | null {
  const name = mapping.name >= 0 ? row[mapping.name]?.trim() : undefined;
  if (!name) return null;
  return {
    name,
    phone: mapping.phone >= 0 ? row[mapping.phone]?.trim() || undefined : undefined,
    email: mapping.email >= 0 ? row[mapping.email]?.trim() || undefined : undefined,
    birthday: mapping.birthday >= 0 ? row[mapping.birthday]?.trim() || undefined : undefined,
    notes: mapping.notes >= 0 ? row[mapping.notes]?.trim() || undefined : undefined,
  };
}

function buildClientsFromMapping(
  dataRows: string[][],
  mapping: Record<KnownField, number>
): ImportClientInput[] {
  const clients: ImportClientInput[] = [];
  for (const row of dataRows) {
    const client = rowToClient(row, mapping);
    if (client) clients.push(client);
  }
  return clients;
}

// ── Template download ─────────────────────────────────────────────────────────

const TEMPLATE_CSV =
  "name,phone,email,birthday,notes\nJane Smith,+1234567890,jane@example.com,1990-03-15,Prefers morning appointments";

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "clients-template.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ImportClientsDialog() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<KnownField, number>>({} as Record<KnownField, number>);
  const [parsedClients, setParsedClients] = useState<ImportClientInput[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);

  function reset() {
    setFileName(null);
    setHeaders([]);
    setDataRows([]);
    setMapping({} as Record<KnownField, number>);
    setParsedClients([]);
    setParseError(null);
    setImporting(false);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function applyMapping(
    newMapping: Record<KnownField, number>,
    rows: string[][]
  ) {
    setMapping(newMapping);
    const clients = buildClientsFromMapping(rows, newMapping);
    setParsedClients(clients);
    if (clients.length === 0 && newMapping.name >= 0) {
      setParseError("No valid clients found with the current column mapping.");
    } else {
      setParseError(null);
    }
  }

  function handleMappingChange(field: KnownField, colIndex: number) {
    const newMapping = { ...mapping, [field]: colIndex };
    applyMapping(newMapping, dataRows);
  }

  function processFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      setParseError("Please select a .csv file.");
      return;
    }
    setFileName(file.name);
    setParseError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const rows = parseCsv(text);
        if (rows.length < 2) {
          setParseError("CSV must have a header row and at least one data row.");
          return;
        }
        const headerRow = rows[0];
        const detectedMapping = detectMapping(headerRow);

        setHeaders(headerRow);
        const rows2 = rows.slice(1);
        setDataRows(rows2);
        applyMapping(detectedMapping, rows2);
      } catch {
        setParseError("Failed to parse CSV. Please check the file format.");
      }
    };
    reader.readAsText(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  async function handleImport() {
    if (!parsedClients.length || importing) return;
    setImporting(true);
    try {
      const result = await importClients(parsedClients);
      setImportResult({ imported: result.imported, skipped: result.skipped });
      toast.success(
        `Imported ${result.imported} client${result.imported !== 1 ? "s" : ""}`,
        result.skipped > 0 ? `${result.skipped} skipped (duplicates or errors)` : undefined
      );
      if (result.errors.length > 0) {
        console.warn("[importClients] errors:", result.errors);
      }
      router.refresh();
    } catch {
      toast.error("Import failed", "An unexpected error occurred.");
    } finally {
      setImporting(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    setOpen(next);
  }

  const previewClients = parsedClients.slice(0, 5);
  const previewFields: (keyof ImportClientInput)[] = ["name", "phone", "email", "birthday", "notes"];

  // Which fields are not auto-mapped (index === -1)?
  const unmappedRequired = mapping.name === undefined || mapping.name < 0;
  const unmappedFields = KNOWN_FIELDS.filter(
    (f) => mapping[f] === undefined || mapping[f] < 0
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" className="flex items-center gap-2" />
        }
      >
        <Upload className="w-4 h-4" />
        Import
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Clients from CSV</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          {/* Template download */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Need a template? Download the sample CSV to see the expected format.
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-1.5 text-xs h-7 flex-shrink-0"
              onClick={downloadTemplate}
            >
              <Download className="w-3.5 h-3.5" />
              Template
            </Button>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !fileName && fileInputRef.current?.click()}
            className={[
              "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
              dragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40 cursor-pointer",
              fileName ? "cursor-default" : "",
            ].join(" ")}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={handleFileChange}
            />

            {fileName ? (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <FileText className="w-5 h-5 text-primary" />
                <span className="font-medium">{fileName}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    reset();
                  }}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Drag and drop a CSV file here
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    or click to browse — expected columns: Name, Phone, Email, Birthday, Notes
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Parse error */}
          {parseError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {parseError}
            </div>
          )}

          {/* Column mapping — shown when CSV is loaded */}
          {headers.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-foreground">Column Mapping</p>
              <div className="rounded-lg border border-border bg-muted/20 p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {KNOWN_FIELDS.map((field) => {
                  const currentIdx = mapping[field] ?? -1;
                  const isAutoMapped = currentIdx >= 0;
                  return (
                    <div key={field} className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground w-16 flex-shrink-0 capitalize">
                        {FIELD_LABELS[field]}
                        {field === "name" && (
                          <span className="text-destructive ml-0.5">*</span>
                        )}
                      </label>
                      <select
                        value={currentIdx}
                        onChange={(e) =>
                          handleMappingChange(field, Number(e.target.value))
                        }
                        className={[
                          "flex-1 min-w-0 h-8 rounded-md border px-2 text-xs bg-background text-foreground",
                          isAutoMapped
                            ? "border-border"
                            : "border-amber-500/60 bg-amber-500/5",
                        ].join(" ")}
                      >
                        <option value={-1}>— skip —</option>
                        {headers.map((h, idx) => (
                          <option key={idx} value={idx}>
                            {h || `Column ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                      {!isAutoMapped && field !== "name" && (
                        <span className="text-xs text-amber-500 flex-shrink-0">unmapped</span>
                      )}
                      {!isAutoMapped && field === "name" && (
                        <span className="text-xs text-destructive flex-shrink-0">required</span>
                      )}
                    </div>
                  );
                })}
              </div>
              {unmappedFields.length > 0 && !unmappedRequired && (
                <p className="text-xs text-muted-foreground">
                  Unmapped columns will be skipped. Use the dropdowns above to map them manually.
                </p>
              )}
            </div>
          )}

          {/* Import result banner */}
          {importResult && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
              Imported {importResult.imported} client{importResult.imported !== 1 ? "s" : ""}
              {importResult.skipped > 0 && ` (${importResult.skipped} skipped — duplicate phone)`}
            </div>
          )}

          {/* Preview table */}
          {parsedClients.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground">
                Preview ({parsedClients.length} client{parsedClients.length !== 1 ? "s" : ""} found)
                {parsedClients.length > 5 && (
                  <span className="text-muted-foreground font-normal"> — showing first 5</span>
                )}
              </p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {previewFields.map((f) => (
                        <th
                          key={f}
                          className="px-3 py-2 text-left font-medium text-muted-foreground capitalize"
                        >
                          {f}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewClients.map((client, i) => (
                      <tr
                        key={i}
                        className="border-b border-border last:border-0 hover:bg-muted/30"
                      >
                        {previewFields.map((f) => (
                          <td
                            key={f}
                            className="px-3 py-2 max-w-[120px] truncate text-foreground"
                          >
                            {client[f] ?? (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            {importResult ? "Close" : "Cancel"}
          </DialogClose>
          {!importResult && (
            <Button
              onClick={handleImport}
              disabled={parsedClients.length === 0 || importing || unmappedRequired}
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import {parsedClients.length > 0 ? `${parsedClients.length} ` : ""}
                  client{parsedClients.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
