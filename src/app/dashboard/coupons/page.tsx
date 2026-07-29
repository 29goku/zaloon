import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import {
  Tag,
  CheckCircle2,
  BarChart2,
  TrendingDown,
  Award,
} from "lucide-react";
import { CouponForm } from "@/components/marketing/coupon-form";
import { CopyCodeButton } from "@/components/marketing/copy-code-button";
import { CouponActiveToggle } from "@/components/coupons/coupon-active-toggle";
import { DeleteCouponButton } from "@/components/coupons/delete-coupon-button";

export const dynamic = "force-dynamic";

// ── Helpers ────────────────────────────────────────────────────────────────────

function getCouponStatus(coupon: {
  active: boolean;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
}): "Active" | "Expired" | "Exhausted" | "Inactive" {
  const today = new Date().toISOString().split("T")[0];
  if (coupon.expiresAt && today > coupon.expiresAt) return "Expired";
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return "Exhausted";
  if (!coupon.active) return "Inactive";
  return "Active";
}

function statusBadgeClass(status: ReturnType<typeof getCouponStatus>): string {
  switch (status) {
    case "Active":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
    case "Expired":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    case "Exhausted":
      return "bg-red-500/15 text-red-600 dark:text-red-400";
    case "Inactive":
      return "bg-muted text-muted-foreground";
  }
}

function estimatedDiscount(coupon: {
  type: string;
  value: number;
  usedCount: number;
  minOrderAmt: number;
}): number {
  if (coupon.type === "FIXED") {
    return coupon.value * coupon.usedCount;
  }
  // For PERCENTAGE: approximate using minOrderAmt as floor, assume avg ~1.5× min
  const avgOrder = coupon.minOrderAmt > 0 ? coupon.minOrderAmt * 1.5 : 50;
  return (coupon.value / 100) * avgOrder * coupon.usedCount;
}

// ── SVG Bar Chart ──────────────────────────────────────────────────────────────

function CouponBarChart({
  data,
}: {
  data: Array<{ code: string; usedCount: number }>;
}) {
  const maxCount = Math.max(...data.map((d) => d.usedCount), 1);
  const BAR_HEIGHT = 28;
  const BAR_GAP = 10;
  const LABEL_W = 110;
  const CHART_W = 300;
  const HEIGHT = data.length * (BAR_HEIGHT + BAR_GAP) - BAR_GAP;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${LABEL_W + CHART_W + 50} ${HEIGHT}`}
      className="overflow-visible"
      aria-label="Top coupons by usage"
    >
      {data.map((d, i) => {
        const y = i * (BAR_HEIGHT + BAR_GAP);
        const barWidth = Math.max(4, (d.usedCount / maxCount) * CHART_W);
        return (
          <g key={d.code}>
            {/* Label */}
            <text
              x={LABEL_W - 8}
              y={y + BAR_HEIGHT / 2 + 1}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-foreground font-mono"
              fontSize={11}
            >
              {d.code}
            </text>
            {/* Bar background */}
            <rect
              x={LABEL_W}
              y={y}
              width={CHART_W}
              height={BAR_HEIGHT}
              rx={6}
              className="fill-muted"
            />
            {/* Bar fill */}
            <rect
              x={LABEL_W}
              y={y}
              width={barWidth}
              height={BAR_HEIGHT}
              rx={6}
              className="fill-primary"
            />
            {/* Count label */}
            <text
              x={LABEL_W + barWidth + 6}
              y={y + BAR_HEIGHT / 2 + 1}
              dominantBaseline="middle"
              className="fill-muted-foreground"
              fontSize={11}
              fontWeight={600}
            >
              {d.usedCount}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function CouponsPage() {
  const salon = await prisma.salon.findFirst();
  const coupons = salon
    ? await prisma.coupon.findMany({
        where: { salonId: salon.id },
        orderBy: { createdAt: "desc" },
      })
    : [];

  // ── Stats ──────────────────────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];

  const activeCoupons = coupons.filter((c) => {
    const notExpired = !c.expiresAt || today <= c.expiresAt;
    const notExhausted = c.maxUses === null || c.usedCount < c.maxUses;
    return c.active && notExpired && notExhausted;
  }).length;

  const totalUses = coupons.reduce((s, c) => s + c.usedCount, 0);

  const totalDiscountGiven = coupons.reduce(
    (sum, c) => sum + estimatedDiscount(c),
    0
  );

  const mostUsed = coupons.reduce(
    (best, c) => (!best || c.usedCount > best.usedCount ? c : best),
    null as (typeof coupons)[0] | null
  );

  // ── Analytics: top 5 coupons by usage ────────────────────────────────────
  const top5 = [...coupons]
    .sort((a, b) => b.usedCount - a.usedCount)
    .slice(0, 5);

  const hasAnyUsage = coupons.some((c) => c.usedCount > 0);

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-6xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Tag className="w-6 h-6 text-primary" />
            Coupons &amp; Discounts
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create, manage, and track discount codes for your salon
          </p>
        </div>
        <CouponForm />
      </div>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Active coupons */}
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">
              {activeCoupons}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Active coupons</p>
          </div>
        </div>

        {/* Total uses */}
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <BarChart2 className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">
              {totalUses}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total uses</p>
          </div>
        </div>

        {/* Estimated discount given */}
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
            <TrendingDown className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">
              ${totalDiscountGiven.toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Est. discount given
            </p>
          </div>
        </div>

        {/* Most used */}
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-amber-500" />
          </div>
          <div className="min-w-0">
            {mostUsed && mostUsed.usedCount > 0 ? (
              <>
                <p className="text-base font-bold text-foreground leading-none truncate font-mono tracking-wider">
                  {mostUsed.code}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Most used &middot; {mostUsed.usedCount}&times;
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-foreground leading-none">—</p>
                <p className="text-xs text-muted-foreground mt-1">Most used</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Coupon table ───────────────────────────────────────────────────── */}
      <section>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {coupons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 gap-3 text-muted-foreground">
              <Tag className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium">No coupons yet.</p>
              <p className="text-xs">
                Create your first coupon to start offering discounts.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Value
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                      Min Order
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Uses
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden lg:table-cell">
                      Expires
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon) => {
                    const status = getCouponStatus(coupon);

                    return (
                      <tr
                        key={coupon.id}
                        className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        {/* Code – click to copy */}
                        <td className="px-4 py-3">
                          <CopyCodeButton code={coupon.code} />
                        </td>

                        {/* Type badge */}
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                              coupon.type === "PERCENTAGE"
                                ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                                : "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                            )}
                          >
                            {coupon.type === "PERCENTAGE" ? "% off" : "$ off"}
                          </span>
                        </td>

                        {/* Value */}
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {coupon.type === "PERCENTAGE"
                            ? `${coupon.value}%`
                            : `$${coupon.value.toFixed(2)}`}
                        </td>

                        {/* Min Order */}
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                          {coupon.minOrderAmt > 0
                            ? `$${coupon.minOrderAmt.toFixed(0)}`
                            : <span className="opacity-40">—</span>}
                        </td>

                        {/* Uses */}
                        <td className="px-4 py-3">
                          <span className="tabular-nums">
                            {coupon.usedCount}
                            {coupon.maxUses !== null ? (
                              <span className="text-muted-foreground">
                                {" / "}
                                {coupon.maxUses}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs ml-1">
                                (unlimited)
                              </span>
                            )}
                          </span>
                        </td>

                        {/* Expires */}
                        <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                          {coupon.expiresAt ?? (
                            <span className="opacity-40">Never</span>
                          )}
                        </td>

                        {/* Status badge */}
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                              statusBadgeClass(status)
                            )}
                          >
                            {status}
                          </span>
                        </td>

                        {/* Actions: Edit | Toggle | Delete */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <CouponForm
                              coupon={{
                                id: coupon.id,
                                code: coupon.code,
                                type: coupon.type,
                                value: coupon.value,
                                minOrderAmt: coupon.minOrderAmt,
                                maxUses: coupon.maxUses,
                                expiresAt: coupon.expiresAt,
                                active: coupon.active,
                              }}
                            />
                            <CouponActiveToggle
                              id={coupon.id}
                              active={coupon.active}
                            />
                            <DeleteCouponButton
                              id={coupon.id}
                              code={coupon.code}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ── Performance analytics ───────────────────────────────────────────── */}
      {hasAnyUsage && (
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            Performance
          </h2>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* SVG bar chart */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-5">
                Top 5 by Usage
              </h3>
              <CouponBarChart
                data={top5.filter((c) => c.usedCount > 0)}
              />
            </div>

            {/* Analytics table */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">
                  Usage Breakdown
                </h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Code
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Uses
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Est. Discount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                      Avg Order
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {top5
                    .filter((c) => c.usedCount > 0)
                    .map((coupon) => {
                      const disc = estimatedDiscount(coupon);
                      const avgOrder =
                        coupon.minOrderAmt > 0
                          ? coupon.minOrderAmt * 1.5
                          : 50;
                      return (
                        <tr
                          key={coupon.id}
                          className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <span className="font-mono font-semibold text-foreground tracking-wider text-xs">
                              {coupon.code}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-foreground">
                            {coupon.usedCount}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-foreground">
                            ${disc.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                            ~${avgOrder.toFixed(0)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
