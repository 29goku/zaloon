/**
 * CSV utilities — shared between export/import flows.
 */

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s =
    value instanceof Date
      ? value.toISOString().split("T")[0]
      : String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Converts an array of objects to a CSV string.
 * @param data   Rows to serialize.
 * @param headers  Optional explicit column ordering + labels.  When omitted
 *                 the keys of the first object are used as both key and label.
 */
export function objectsToCSV(
  data: Record<string, unknown>[],
  headers?: { key: string; label: string }[]
): string {
  if (data.length === 0) return "";

  const cols: { key: string; label: string }[] =
    headers ?? Object.keys(data[0]).map((k) => ({ key: k, label: k }));

  const headerRow = cols.map((c) => escapeCell(c.label)).join(",");
  const rows = data.map((row) =>
    cols.map((c) => escapeCell(row[c.key])).join(",")
  );
  return [headerRow, ...rows].join("\n");
}

/**
 * Parses a CSV string into an array of plain objects keyed by the header row.
 * RFC-4180-aware: handles quoted fields, embedded commas, and escaped quotes.
 */
export function parseCSV(text: string): Record<string, string>[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  function splitLine(line: string): string[] {
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
    return cols;
  }

  const lines = normalized.split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];

  const headers = splitLine(lines[0]).map((h) => h.trim());
  const result: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (cells[idx] ?? "").trim();
    });
    result.push(obj);
  }

  return result;
}
