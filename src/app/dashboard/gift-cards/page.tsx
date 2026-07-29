import { Gift, TrendingDown, CreditCard, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { IssueGiftCardDialog } from "@/components/gift-cards/issue-gift-card-dialog";

export const dynamic = "force-dynamic";

function statusBadgeClass(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "REDEEMED":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "EXPIRED":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    case "VOIDED":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default async function GiftCardsPage() {
  const cards = await prisma.giftCard.findMany({
    orderBy: { createdAt: "desc" },
  });

  const totalOutstanding = cards
    .filter((c) => c.status === "ACTIVE")
    .reduce((sum, c) => sum + c.balance, 0);

  const totalIssued = cards.length;
  const totalRedeemed = cards.filter((c) => c.status === "REDEEMED").length;

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Gift className="w-6 h-6 text-primary" />
            Gift Cards
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Issue, track, and redeem gift cards
          </p>
        </div>
        <IssueGiftCardDialog />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <TrendingDown className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">
              ${totalOutstanding.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Outstanding value</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">
              {totalIssued}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Cards issued</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">
              {totalRedeemed}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Cards redeemed</p>
          </div>
        </div>
      </div>

      {/* Gift card list */}
      <section>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Gift className="w-10 h-10 opacity-30" />
              <p className="text-sm">No gift cards yet. Issue one to get started.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Purchaser</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Recipient</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Balance</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground hidden md:table-cell">Expires</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((card) => {
                  const pct =
                    card.initialValue > 0
                      ? Math.round((card.balance / card.initialValue) * 100)
                      : 0;

                  return (
                    <tr
                      key={card.id}
                      className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-foreground tracking-wider">
                          {card.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {card.purchasedBy ?? <span className="opacity-40">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {card.recipientName ?? <span className="opacity-40">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1 min-w-[120px]">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-foreground">
                              ${card.balance.toFixed(2)}
                            </span>
                            <span className="text-muted-foreground">
                              / ${card.initialValue.toFixed(2)}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                pct > 50
                                  ? "bg-primary"
                                  : pct > 20
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
                            statusBadgeClass(card.status)
                          )}
                        >
                          {card.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs hidden md:table-cell">
                        {card.expiresAt ?? <span className="opacity-40">No expiry</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
