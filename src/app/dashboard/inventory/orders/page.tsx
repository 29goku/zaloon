import Link from "next/link";
import {
  ClipboardList,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Package,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getPurchaseOrders } from "@/app/actions/inventory";
import { getInventory } from "@/app/actions/inventory";
import { PurchaseOrderActions } from "@/components/inventory/purchase-order-actions";
import { CreatePurchaseOrderDialog } from "@/components/inventory/create-purchase-order-dialog";

export const dynamic = "force-dynamic";

const STATUS_CONFIG = {
  PENDING: {
    label: "Pending",
    icon: Clock,
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    iconClass: "text-amber-500",
  },
  RECEIVED: {
    label: "Received",
    icon: CheckCircle,
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    iconClass: "text-emerald-500",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: XCircle,
    className: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    iconClass: "text-rose-500",
  },
} as const;

export default async function PurchaseOrdersPage() {
  const [orders, inventoryItems] = await Promise.all([
    getPurchaseOrders(),
    getInventory(),
  ]);

  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const receivedCount = orders.filter((o) => o.status === "RECEIVED").length;

  const itemOptions = inventoryItems.map((item) => ({
    id: item.id,
    name: item.name,
    unit: item.unit,
    costPrice: item.costPrice,
  }));

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/inventory"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Inventory
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-primary" />
            Purchase Orders
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and track supplier orders
          </p>
        </div>
        <CreatePurchaseOrderDialog inventoryItems={itemOptions} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Total Orders</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{orders.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Pending</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {pendingCount}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Received</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {receivedCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Orders list */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            {orders.length} Order{orders.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="w-8 h-8" />}
              title="No purchase orders"
              description="Create your first purchase order to track supplier restocking."
            />
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const status = STATUS_CONFIG[order.status];
                const StatusIcon = status.icon;
                const orderedDate = new Date(order.orderedAt);
                const receivedDate = order.receivedAt
                  ? new Date(order.receivedAt)
                  : null;

                return (
                  <div
                    key={order.id}
                    className="border border-border rounded-xl p-4 hover:bg-secondary/20 transition-colors"
                  >
                    {/* Order header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <ClipboardList className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{order.supplier}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Ordered:{" "}
                            {orderedDate.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                            {receivedDate && (
                              <span className="ml-2">
                                · Received:{" "}
                                {receivedDate.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            )}
                          </p>
                          {order.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              {order.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Status badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}
                        >
                          <StatusIcon className={`w-3 h-3 ${status.iconClass}`} />
                          {status.label}
                        </span>

                        {/* Total */}
                        <span className="font-bold text-foreground tabular-nums">
                          $
                          {order.total.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>

                        {/* Actions (receive / cancel) */}
                        {order.status === "PENDING" && (
                          <PurchaseOrderActions orderId={order.id} />
                        )}
                      </div>
                    </div>

                    {/* Order line items */}
                    <div className="rounded-lg bg-secondary/50 divide-y divide-border overflow-hidden">
                      {order.items.map((line, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-foreground font-medium">
                              {line.name}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              × {line.qty}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-right">
                            <span className="text-muted-foreground text-xs">
                              ${line.unitCost.toFixed(2)} each
                            </span>
                            <span className="font-semibold text-foreground tabular-nums">
                              ${(line.qty * line.unitCost).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
