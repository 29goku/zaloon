"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PackageCheck, Loader2, CheckCircle } from "lucide-react";
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
import { bulkRestock } from "@/app/actions/inventory";

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  minQuantity: number;
  unit: string;
}

interface BulkRestockDialogProps {
  lowStockItems: LowStockItem[];
}

export function BulkRestockDialog({ lowStockItems }: BulkRestockDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [qtys, setQtys] = React.useState<Record<string, string>>({});
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ updated: number } | null>(null);

  // Suggested restock quantity: bring to 2x minQuantity
  function suggestedQty(item: LowStockItem): number {
    const target = item.minQuantity * 2;
    return Math.max(1, target - item.quantity);
  }

  function handleOpen() {
    // Pre-populate suggested quantities
    const initial: Record<string, string> = {};
    for (const item of lowStockItems) {
      initial[item.id] = String(suggestedQty(item));
    }
    setQtys(initial);
    setNotes({});
    setError(null);
    setResult(null);
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setResult(null);
    setError(null);
  }

  async function handleSubmit() {
    const items = lowStockItems
      .map((item) => ({
        itemId: item.id,
        qty: parseInt(qtys[item.id] ?? "0") || 0,
        note: notes[item.id] || undefined,
      }))
      .filter((i) => i.qty > 0);

    if (items.length === 0) {
      setError("Please enter at least one quantity greater than 0.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await bulkRestock(items);
    setLoading(false);

    if (!res.success) {
      setError(res.error ?? "Failed to restock items");
      return;
    }

    setResult({ updated: res.updated });
    router.refresh();
  }

  if (lowStockItems.length === 0) return null;

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-sm font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
      >
        <PackageCheck className="w-4 h-4" />
        Bulk Restock
        <span className="text-xs bg-amber-200 dark:bg-amber-900 px-1.5 py-0.5 rounded-full">
          {lowStockItems.length}
        </span>
      </button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-amber-500" />
              Bulk Restock
            </DialogTitle>
          </DialogHeader>

          {result ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {result.updated} item{result.updated !== 1 ? "s" : ""} restocked!
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Inventory transactions have been recorded.
                </p>
              </div>
              <Button variant="outline" onClick={handleClose} className="mt-1">
                Done
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground -mt-1">
                Enter restock quantities for each low-stock item. Suggested quantities bring stock to 2× minimum.
              </p>

              <div className="flex flex-col gap-4 mt-2">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground text-sm">{item.name}</p>
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          Current: {item.quantity} {item.unit} · Min: {item.minQuantity} {item.unit}
                        </p>
                      </div>
                      <span className="text-xs font-medium bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full flex-shrink-0">
                        Low Stock
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Add Quantity ({item.unit})</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={qtys[item.id] ?? ""}
                          onChange={(e) =>
                            setQtys((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          className="h-8 text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Note (optional)</Label>
                        <Input
                          type="text"
                          value={notes[item.id] ?? ""}
                          onChange={(e) =>
                            setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          className="h-8 text-sm"
                          placeholder="e.g. Delivery received"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>
                  Cancel
                </DialogClose>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Restocking…
                    </>
                  ) : (
                    <>
                      <PackageCheck className="w-4 h-4" />
                      Restock All
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
