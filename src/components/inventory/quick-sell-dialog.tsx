"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Loader2, Package } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sellProduct } from "@/app/actions/inventory";

interface QuickSellDialogProps {
  itemId: string;
  itemName: string;
  currentStock: number;
  unit: string;
  /** salePrice used as retailPrice until schema migration */
  retailPrice: number | null;
  trigger?: React.ReactNode;
}

export function QuickSellDialog({
  itemId,
  itemName,
  currentStock,
  unit,
  retailPrice,
  trigger,
}: QuickSellDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [qty, setQty] = React.useState("1");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  const qtyNum = parseInt(qty) || 0;
  const total = retailPrice != null ? (retailPrice * qtyNum).toFixed(2) : null;

  async function handleSell() {
    if (qtyNum <= 0) { setError("Quantity must be at least 1"); return; }
    if (qtyNum > currentStock) { setError(`Only ${currentStock} in stock`); return; }
    setError(null);
    setLoading(true);
    const result = await sellProduct(itemId, qtyNum);
    setLoading(false);
    if (!result.success) { setError(result.error ?? "Failed to sell"); return; }
    setOpen(false);
    setQty("1");
    router.refresh();
  }

  function handleOpenChange(next: boolean) {
    if (!next) { setQty("1"); setError(null); }
    setOpen(next);
  }

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)} className="inline-flex cursor-pointer">
          {trigger}
        </span>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 text-xs"
          onClick={() => setOpen(true)}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Sell
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Quick Sell
            </DialogTitle>
          </DialogHeader>

          <div className="rounded-lg bg-secondary/60 px-4 py-3 text-sm">
            <p className="font-semibold text-foreground">{itemName}</p>
            <p className="text-muted-foreground mt-0.5">
              Stock:{" "}
              <span className="font-semibold text-foreground">
                {currentStock} {unit}
              </span>
              {retailPrice != null && (
                <span className="ml-3">
                  Retail price:{" "}
                  <span className="font-semibold text-foreground">
                    ${retailPrice.toFixed(2)}
                  </span>
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sell-qty">
                Quantity to Sell <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="sell-qty"
                  type="number"
                  min="1"
                  max={currentStock}
                  step="1"
                  value={qty}
                  onChange={(e) => { setQty(e.target.value); setError(null); }}
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {unit}
                </span>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            {total != null && qtyNum > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold text-primary">${total}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              onClick={handleSell}
              disabled={loading || qtyNum <= 0 || qtyNum > currentStock}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Selling…
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  Sell {qtyNum > 0 ? qtyNum : ""} {unit}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
