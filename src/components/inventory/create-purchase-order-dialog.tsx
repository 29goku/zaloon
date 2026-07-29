"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, ClipboardList } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPurchaseOrder } from "@/app/actions/inventory";

interface InventoryItemOption {
  id: string;
  name: string;
  unit: string;
  costPrice: number | null;
}

interface LineItem {
  inventoryItemId: string;
  name: string;
  qty: number;
  unitCost: number;
}

interface Props {
  inventoryItems: InventoryItemOption[];
}

export function CreatePurchaseOrderDialog({ inventoryItems }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [supplier, setSupplier] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [lines, setLines] = React.useState<LineItem[]>([
    { inventoryItemId: "", name: "", qty: 1, unitCost: 0 },
  ]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  function handleItemSelect(lineIdx: number, itemId: string) {
    const item = inventoryItems.find((i) => i.id === itemId);
    if (!item) return;
    setLines((prev) =>
      prev.map((l, i) =>
        i === lineIdx
          ? {
              ...l,
              inventoryItemId: item.id,
              name: item.name,
              unitCost: item.costPrice ?? 0,
            }
          : l
      )
    );
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { inventoryItemId: "", name: "", qty: 1, unitCost: 0 },
    ]);
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, field: keyof LineItem, value: string | number) {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l))
    );
  }

  const total = lines.reduce((sum, l) => sum + l.qty * l.unitCost, 0);

  async function handleSubmit() {
    if (!supplier.trim()) { setError("Supplier name is required"); return; }
    const validLines = lines.filter((l) => l.inventoryItemId && l.qty > 0);
    if (validLines.length === 0) {
      setError("Add at least one item with qty > 0");
      return;
    }

    setError(null);
    setLoading(true);

    const result = await createPurchaseOrder({
      supplier: supplier.trim(),
      items: validLines,
      total,
      notes: notes.trim() || undefined,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Failed to create order");
      return;
    }

    setOpen(false);
    resetForm();
    router.refresh();
  }

  function resetForm() {
    setSupplier("");
    setNotes("");
    setLines([{ inventoryItemId: "", name: "", qty: 1, unitCost: 0 }]);
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    setOpen(next);
  }

  return (
    <>
      <Button
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
        onClick={() => setOpen(true)}
      >
        <Plus className="w-4 h-4" />
        New Order
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              Create Purchase Order
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 mt-2">
            {/* Supplier */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="po-supplier">
                Supplier <span className="text-destructive">*</span>
              </Label>
              <Input
                id="po-supplier"
                placeholder="e.g. Salon Centric"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </div>

            {/* Line items */}
            <div className="flex flex-col gap-2">
              <Label>
                Items <span className="text-destructive">*</span>
              </Label>

              {lines.map((line, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-border p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Select
                        value={line.inventoryItemId}
                        onValueChange={(val) => handleItemSelect(idx, val ?? "")}
                      >
                        <SelectTrigger className="w-full text-sm">
                          <SelectValue placeholder="Select product…" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryItems.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {lines.length > 1 && (
                      <button
                        onClick={() => removeLine(idx)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs text-muted-foreground">Qty</Label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={line.qty}
                        onChange={(e) =>
                          updateLine(idx, "qty", parseInt(e.target.value) || 1)
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs text-muted-foreground">Unit Cost ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitCost}
                        onChange={(e) =>
                          updateLine(idx, "unitCost", parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                  </div>

                  {line.inventoryItemId && (
                    <p className="text-xs text-muted-foreground text-right">
                      Line total: ${(line.qty * line.unitCost).toFixed(2)}
                    </p>
                  )}
                </div>
              ))}

              <button
                onClick={addLine}
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add another item
              </button>
            </div>

            {/* Total */}
            {total > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold">
                <span className="text-muted-foreground">Order Total</span>
                <span className="text-primary">${total.toFixed(2)}</span>
              </div>
            )}

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="po-notes">Notes (optional)</Label>
              <Input
                id="po-notes"
                placeholder="Any special instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter className="mt-2">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create Order"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
