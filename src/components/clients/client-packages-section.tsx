"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Package2, Plus, ShoppingBag, CalendarClock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { purchasePackage } from "@/app/actions/packages";
import type { ServicePackage, ClientPackagePurchase } from "@/app/actions/packages";

interface ClientPackage {
  purchase: ClientPackagePurchase;
  package: ServicePackage;
  sessionsRemaining: number;
  expiresAt: string;
}

interface ClientPackagesSectionProps {
  clientId: string;
  clientPackages: ClientPackage[];
  availablePackages: ServicePackage[];
  currency?: string;
}

export function ClientPackagesSection({
  clientId,
  clientPackages,
  availablePackages,
  currency = "USD",
}: ClientPackagesSectionProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, start] = useTransition();

  const activePackages = availablePackages.filter((p) => p.isActive);

  function handlePurchase() {
    if (!selectedId) {
      setFeedback({ type: "error", message: "Please select a package" });
      return;
    }
    setFeedback(null);
    start(async () => {
      const res = await purchasePackage(clientId, selectedId);
      if (res.success) {
        setFeedback({ type: "success", message: "Package purchased successfully!" });
        router.refresh();
        setTimeout(() => {
          setOpen(false);
          setFeedback(null);
          setSelectedId("");
        }, 1200);
      } else {
        setFeedback({ type: "error", message: res.error ?? "Purchase failed" });
      }
    });
  }

  const now = new Date();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {clientPackages.length} package purchase{clientPackages.length !== 1 ? "s" : ""}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setOpen(true)}
          className="gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Purchase package
        </Button>
      </div>

      {/* Empty state */}
      {clientPackages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <Package2 className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">No packages purchased yet</p>
          <p className="text-xs mt-1 opacity-70">
            Purchase a package to give this client discounted session bundles.
          </p>
        </div>
      )}

      {/* Package purchase cards */}
      {clientPackages.length > 0 && (
        <div className="space-y-3">
          {clientPackages.map(({ purchase, package: pkg, sessionsRemaining, expiresAt }) => {
            const totalSessions =
              pkg.sessions ?? pkg.services.reduce((s, e) => s + e.qty, 0);
            const usedSessions = totalSessions - sessionsRemaining;
            const progressPct = totalSessions > 0
              ? Math.round((usedSessions / totalSessions) * 100)
              : 0;
            const isExpired = now > new Date(expiresAt);
            const isExhausted = sessionsRemaining <= 0;

            return (
              <div
                key={purchase.id}
                className={`rounded-xl border p-4 transition-colors ${
                  isExpired || isExhausted
                    ? "border-border bg-muted/30 opacity-70"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                {/* Package name + status */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ShoppingBag className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="font-semibold text-foreground text-sm">
                        {pkg.name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Purchased {new Date(purchase.purchasedAt).toLocaleDateString("en", { dateStyle: "medium" })}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      isExpired || isExhausted
                        ? "bg-muted text-muted-foreground"
                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {isExpired ? "Expired" : isExhausted ? "Used up" : "Active"}
                  </span>
                </div>

                {/* Session progress */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>
                      {sessionsRemaining} session{sessionsRemaining !== 1 ? "s" : ""} remaining
                    </span>
                    <span>
                      {usedSessions}/{totalSessions} used
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Expiry */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarClock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    {isExpired ? "Expired" : "Expires"}{" "}
                    {new Date(expiresAt).toLocaleDateString("en", { dateStyle: "medium" })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Purchase modal */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setFeedback(null); setSelectedId(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Purchase Package</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {activePackages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active packages available. Create packages in Services → Packages.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  {activePackages.map((pkg) => {
                    const totalSessions =
                      pkg.sessions ?? pkg.services.reduce((s, e) => s + e.qty, 0);
                    const isSelected = selectedId === pkg.id;

                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setSelectedId(pkg.id)}
                        className={`w-full text-left rounded-xl border p-3.5 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground text-sm">
                              {pkg.name}
                            </p>
                            {pkg.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {pkg.description}
                              </p>
                            )}
                            <div className="flex gap-2 mt-1.5 flex-wrap">
                              <span className="text-xs bg-secondary rounded px-1.5 py-0.5">
                                {totalSessions} sessions
                              </span>
                              <span className="text-xs bg-secondary rounded px-1.5 py-0.5">
                                {pkg.validityDays}d validity
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-foreground">
                              {fmt(pkg.price)}
                            </p>
                            {pkg.originalPrice > pkg.price && (
                              <p className="text-xs text-muted-foreground line-through">
                                {fmt(pkg.originalPrice)}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Feedback */}
                {feedback && (
                  <div
                    className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
                      feedback.type === "success"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {feedback.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    {feedback.message}
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePurchase}
                    disabled={isPending || !selectedId}
                    className="gap-2"
                  >
                    {isPending ? "Processing…" : "Purchase"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
