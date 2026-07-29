"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { ExportButton } from "./export-button";

export interface StaffRatingRow {
  staffId: string;
  name: string;
  avgRating: number;
  reviewCount: number;
  revenue: number;
  totalAppointments: number;
  completedAppointments: number;
}

interface StaffRatingsTableProps {
  data: StaffRatingRow[];
  currency: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3 h-3 ${
            s <= Math.round(rating) ? "fill-[#F48E16] text-[#F48E16]" : "fill-none text-muted-foreground/40"
          }`}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground tabular-nums">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

export function StaffRatingsTable({ data, currency }: StaffRatingsTableProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  const sorted = [...data].sort((a, b) => b.avgRating - a.avgRating);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="w-4 h-4 text-[#F48E16]" />
            Staff Ratings
          </CardTitle>
          <ExportButton
            label="staff-ratings"
            getData={() =>
              sorted.map((r) => ({
                "Staff Member": r.name,
                "Avg Rating": r.avgRating.toFixed(1),
                Reviews: r.reviewCount,
                "Total Appointments": r.totalAppointments,
                Completed: r.completedAppointments,
                "Utilization %":
                  r.totalAppointments > 0
                    ? ((r.completedAppointments / r.totalAppointments) * 100).toFixed(1)
                    : "0",
                Revenue: r.revenue,
              }))
            }
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {sorted.length === 0 ? (
          <div className="h-32 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">No rating data for this period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">
                    Staff Member
                  </th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">
                    Rating
                  </th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">
                    Reviews
                  </th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">
                    Utilization
                  </th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, idx) => {
                  const utilization =
                    row.totalAppointments > 0
                      ? Math.round((row.completedAppointments / row.totalAppointments) * 100)
                      : 0;

                  return (
                    <tr
                      key={row.staffId}
                      className={`border-b border-border/50 hover:bg-secondary/40 transition-colors ${
                        idx === sorted.length - 1 ? "border-b-0" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#F48E16]/15 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-[#F48E16]">
                              {row.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </span>
                          </div>
                          <span className="font-medium text-foreground">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {row.reviewCount > 0 ? (
                          <div className="flex justify-end">
                            <StarRating rating={row.avgRating} />
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">No reviews</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right text-muted-foreground tabular-nums">
                        {row.reviewCount}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${utilization}%` }}
                            />
                          </div>
                          <span
                            className={`text-xs font-medium tabular-nums ${
                              utilization >= 80
                                ? "text-emerald-500"
                                : utilization >= 50
                                ? "text-[#F48E16]"
                                : "text-[#F41666]"
                            }`}
                          >
                            {utilization}%
                          </span>
                        </div>
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
