"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scissors } from "lucide-react";

export interface TopServiceRow {
  name: string;
  /** Number of bookings in the period */
  count: number;
  /** Total revenue attributed to this service */
  revenue: number;
  /** Average revenue per booking */
  avgPrice: number;
}

interface TopServicesTableProps {
  data: TopServiceRow[];
  currency: string;
}

export function TopServicesTable({ data, currency }: TopServicesTableProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Scissors className="w-4 h-4 text-[#F48E16]" />
          Top Services
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="h-32 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">No service data for this period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">
                    Service
                  </th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">
                    Bookings
                  </th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">
                    Avg Price
                  </th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => {
                  const isLast = idx === data.length - 1;
                  // Revenue share bar relative to top service
                  const maxRev = data[0]?.revenue ?? 1;
                  const pct = maxRev > 0 ? (row.revenue / maxRev) * 100 : 0;

                  return (
                    <tr
                      key={row.name}
                      className={`border-b border-border/50 hover:bg-secondary/40 transition-colors ${
                        isLast ? "border-b-0" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-foreground leading-tight">
                            {row.name}
                          </span>
                          {/* Mini share bar */}
                          <div className="h-1 w-24 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#F48E16]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right text-foreground tabular-nums">
                        {row.count}
                      </td>
                      <td className="px-5 py-3.5 text-right text-muted-foreground tabular-nums">
                        {fmt(row.avgPrice)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-foreground tabular-nums">
                        {fmt(row.revenue)}
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
