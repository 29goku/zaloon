import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tag } from "lucide-react";
import { CreateCouponDialog } from "@/components/coupons/create-coupon-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { CouponActiveToggle } from "@/components/coupons/coupon-active-toggle";
import { DeleteCouponButton } from "@/components/coupons/delete-coupon-button";

export const dynamic = "force-dynamic";

function formatValue(type: string, value: number) {
  if (type === "PERCENTAGE") return `${value}% off`;
  return `$${value.toFixed(2)} off`;
}

export default async function CouponsPage() {
  const salon = await prisma.salon.findFirst();
  const coupons = salon
    ? await prisma.coupon.findMany({
        where: { salonId: salon.id },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const activeCoupons = coupons.filter((c) => c.active).length;
  const totalUses = coupons.reduce((s, c) => s + c.usedCount, 0);

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Coupons</h1>
          <p className="text-muted-foreground mt-1">Manage discount codes for your salon</p>
        </div>
        <CreateCouponDialog />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Coupons</p>
                <p className="text-2xl font-bold text-foreground mt-1">{coupons.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Tag className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Active</p>
                <p className="text-2xl font-bold text-foreground mt-1">{activeCoupons}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Tag className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Uses</p>
                <p className="text-2xl font-bold text-foreground mt-1">{totalUses}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Tag className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coupons table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            {coupons.length} Coupon{coupons.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <EmptyState
              icon={<Tag className="w-8 h-8" />}
              title="No coupons yet"
              description="Create your first coupon to offer discounts to clients."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Code
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Type
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Value
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Usage
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Expiry
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Active
                    </th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon) => {
                    const today = new Date().toISOString().split("T")[0];
                    const isExpired = coupon.expiresAt ? today > coupon.expiresAt : false;
                    const isExhausted =
                      coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses;

                    return (
                      <tr
                        key={coupon.id}
                        className="border-b border-border/50 hover:bg-secondary/40 transition-colors"
                      >
                        {/* Code */}
                        <td className="py-3 pr-4">
                          <span className="font-mono font-semibold text-foreground tracking-wider">
                            {coupon.code}
                          </span>
                        </td>

                        {/* Type badge */}
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              coupon.type === "PERCENTAGE"
                                ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                                : "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                            }`}
                          >
                            {coupon.type === "PERCENTAGE" ? "%" : "$"}
                          </span>
                        </td>

                        {/* Value */}
                        <td className="py-3 pr-4 font-semibold text-foreground">
                          {formatValue(coupon.type, coupon.value)}
                          {coupon.minOrderAmt > 0 && (
                            <span className="block text-xs font-normal text-muted-foreground">
                              min ${coupon.minOrderAmt.toFixed(0)}
                            </span>
                          )}
                        </td>

                        {/* Usage */}
                        <td className="py-3 pr-4">
                          <span
                            className={`text-sm ${
                              isExhausted ? "text-destructive font-semibold" : "text-foreground"
                            }`}
                          >
                            {coupon.usedCount}
                            {coupon.maxUses !== null ? ` / ${coupon.maxUses}` : ""}
                          </span>
                          {isExhausted && (
                            <span className="block text-xs text-destructive">Exhausted</span>
                          )}
                        </td>

                        {/* Expiry */}
                        <td className="py-3 pr-4">
                          {coupon.expiresAt ? (
                            <span
                              className={`text-sm ${
                                isExpired ? "text-destructive font-semibold" : "text-foreground"
                              }`}
                            >
                              {coupon.expiresAt}
                              {isExpired && (
                                <span className="block text-xs text-destructive">Expired</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">No expiry</span>
                          )}
                        </td>

                        {/* Active toggle */}
                        <td className="py-3 pr-4">
                          <CouponActiveToggle id={coupon.id} active={coupon.active} />
                        </td>

                        {/* Delete */}
                        <td className="py-3 text-right">
                          <DeleteCouponButton id={coupon.id} code={coupon.code} />
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
    </div>
  );
}
