import { ExportHub } from "./export-hub";

export const dynamic = "force-dynamic";

export default function ExportPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Export Data</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Download your salon data as CSV files. Use filters to narrow the export range.
        </p>
      </div>
      <ExportHub />
    </div>
  );
}
