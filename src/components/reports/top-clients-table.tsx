"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown } from "lucide-react";
import { ExportButton } from "./export-button";

export interface TopClientRow {
  clientId: string;
  name: string;
  totalSpend: number;
  visitCount: number;
  avgTicket: number;
}

interface TopClientsTableProps {
  data: TopClientRow[];
  currency: string;
}

export function TopClientsTable({ data, currency }: TopClientsTableProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="w-4 h-4 text-[#F48E16]" />
            Top Clients by Spend
          </CardTitle>
          <ExportButton
            label="top-clients"
            getData={() =>
              data.map((r, i) => ({
                Rank: i + 1,
                Client: r.name,
                Visits: r.visitCount,
                "Avg Ticket": r.avgTicket,
                "Total Spend": r.totalSpend,
              }))
            }
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="h-32 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">No client data for this period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">
                    #
                  </th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">
                    Client
                  </th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">
                    Visits
                  </th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">
                    Avg Ticket
                  </th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">
                    Total Spend
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => {
                  const isLast = idx === data.length - 1;
                  const maxSpend = data[0]?.totalSpend ?? 1;
                  const pct = maxSpend > 0 ? (row.totalSpend / maxSpend) * 100 : 0;
                  const rankColors = ["text-yellow-500", "text-zinc-400", "text-amber-600"];

                  return (
                    <tr
                      key={row.clientId}
                      className={`border-b border-border/50 hover:bg-secondary/40 transition-colors ${
                        isLast ? "border-b-0" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-sm font-bold tabular-nums ${
                            rankColors[idx] ?? "text-muted-foreground"
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-foreground leading-tight">
                            {row.name}
                          </span>
                          <div className="h-1 w-24 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#F48E16]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right text-foreground tabular-nums">
                        {row.visitCount}
                      </td>
                      <td className="px-5 py-3.5 text-right text-muted-foreground tabular-nums">
                        {fmt(row.avgTicket)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-foreground tabular-nums">
                        {fmt(row.totalSpend)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
