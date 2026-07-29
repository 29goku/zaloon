import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, TrendingUp, TrendingDown, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LedgerPage() {
  const salon = await prisma.salon.findFirst();
  const currency = salon?.currency ?? "USD";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  const entries = await prisma.ledgerEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { client: true },
  });

  const totalCredit = entries
    .filter((e) => e.type === "CREDIT")
    .reduce((s, e) => s + e.amount, 0);
  const totalDebit = entries
    .filter((e) => e.type === "DEBIT")
    .reduce((s, e) => s + e.amount, 0);
  const balance = totalCredit - totalDebit;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ledger</h1>
          <p className="text-muted-foreground mt-1">Client tab & balance tracking</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          Add Entry
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Credit</p>
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">{fmt(totalCredit)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Debit</p>
              <TrendingDown className="w-4 h-4 text-[#F41666]" />
            </div>
            <p className="text-2xl font-bold text-[#F41666]">{fmt(totalDebit)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Net Balance</p>
              <BookOpen className="w-4 h-4 text-[#F48E16]" />
            </div>
            <p
              className={`text-2xl font-bold ${
                balance >= 0 ? "text-primary" : "text-[#F41666]"
              }`}
            >
              {fmt(balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Entries */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Recent Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No ledger entries yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      entry.type === "CREDIT"
                        ? "bg-primary/20"
                        : "bg-[#F41666]/20"
                    }`}
                  >
                    {entry.type === "CREDIT" ? (
                      <TrendingUp className="w-4 h-4 text-primary" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-[#F41666]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">
                      {entry.client.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {entry.note ?? entry.type}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className={`font-bold text-sm ${
                        entry.type === "CREDIT" ? "text-primary" : "text-[#F41666]"
                      }`}
                    >
                      {entry.type === "CREDIT" ? "+" : "-"}
                      {fmt(entry.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
