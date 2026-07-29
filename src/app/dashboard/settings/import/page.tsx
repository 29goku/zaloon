import { ImportHub } from "./import-hub";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Import Data</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload CSV files to bulk-import clients, services, and more.
        </p>
      </div>
      <ImportHub />
    </div>
  );
}
