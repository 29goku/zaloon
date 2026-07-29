import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, TrendingUp, TrendingDown } from "lucide-react";
import { AddLedgerDialog } from "@/components/ledger/add-ledger-dialog";
import { DeleteLedgerButton } from "@/components/ledger/delete-ledger-button";

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

  const [entries, clients] = await Promise.all([
    prisma.ledgerEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { Client: true },
    }),
    prisma.client.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const totalCredit = entries
    .filter((e) => e.type === "CREDIT")
    .reduce((s, e) => s + e.amount, 0);
  const totalDebit = entries
    .filter((e) => e.type === "DEBIT")
    .reduce((s, e) => s + e.amount, 0);
  const balance = totalCredit - totalDebit;

  // Build per-client balance map from ALL entries (re-query without limit)
  const allEntries = await prisma.ledgerEntry.findMany({
    select: { clientId: true, type: true, amount: true, Client: { select: { name: true } } },
  });

  const clientBalanceMap = new Map<string, { name: string; net: number }>();
  for (const e of allEntries) {
    const existing = clientBalanceMap.get(e.clientId) ?? { name: e.Client.name, net: 0 };
    existing.net += e.type === "CREDIT" ? e.amount : -e.amount;
    clientBalanceMap.set(e.clientId, existing);
  }
  const clientBalances = Array.from(clientBalanceMap.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6 md:mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Ledger</h1>
          <p className="text-muted-foreground mt-1">Client tab &amp; balance tracking</p>
        </div>
        <AddLedgerDialog clients={clients} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 md:mb-8">
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

      {/* Per-Client Balance */}
      {clientBalances.length > 0 && (
        <Card className="bg-card border-border mb-8">
          <CardHeader>
            <CardTitle className="text-base">Per Client Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {clientBalances.map((cb) => (
                <div
                  key={cb.id}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="text-sm font-medium text-foreground">{cb.name}</span>
                  <span
                    className={`text-sm font-bold ${
                      cb.net >= 0 ? "text-primary" : "text-[#F41666]"
                    }`}
                  >
                    {cb.net >= 0 ? "+" : ""}
                    {fmt(cb.net)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entries */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">
            Recent Entries
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              (showing up to 50)
            </span>
          </CardTitle>
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
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-secondary/50 transition-colors group"
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
                      {entry.Client.name}
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
                  <DeleteLedgerButton id={entry.id} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
