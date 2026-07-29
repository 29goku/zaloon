"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { bulkUpdatePrices } from "@/app/actions/services";

export function BulkPriceDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const [percentage, setPercentage] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const pct = parseFloat(percentage);
  const validPct = !isNaN(pct) && pct !== 0;

  function handleOpen() {
    setPercentage("");
    setError(null);
    setConfirming(false);
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setConfirming(false);
    setPercentage("");
    setError(null);
  }

  async function handleConfirm() {
    if (!validPct) return;
    setLoading(true);
    setError(null);
    const result = await bulkUpdatePrices(pct);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    handleClose();
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" className="flex items-center gap-2" onClick={handleOpen}>
        <TrendingUp className="w-4 h-4" />
        Bulk Price Update
      </Button>

      <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Bulk Price Update</DialogTitle>
          </DialogHeader>

          {!confirming ? (
            <div className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground">
                Adjust prices for all services by a percentage. Use a positive value to
                increase, negative to decrease.
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="bulk-pct">Percentage change</Label>
                <div className="relative">
                  <Input
                    id="bulk-pct"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 10 or -5"
                    value={percentage}
                    onChange={(e) => setPercentage(e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                    %
                  </span>
                </div>
                {validPct && (
                  <p className="text-xs text-muted-foreground">
                    Prices will be{" "}
                    <span className={pct > 0 ? "text-green-500" : "text-destructive"}>
                      {pct > 0 ? "increased" : "decreased"} by {Math.abs(pct)}%
                    </span>
                  </p>
                )}
              </div>

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  disabled={!validPct}
                  onClick={() => setConfirming(true)}
                >
                  Continue
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground">
                This will{" "}
                <span className="font-medium text-foreground">
                  {pct > 0 ? "increase" : "decrease"} all service prices by{" "}
                  {Math.abs(pct)}%
                </span>
                . This action cannot be undone.
              </p>

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setConfirming(false)}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  variant={pct < 0 ? "destructive" : "default"}
                  onClick={handleConfirm}
                  disabled={loading}
                  className="gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Update
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
