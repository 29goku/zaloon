"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { addLoyaltyPoints } from "@/app/actions/clients";
import { Button } from "@/components/ui/button";
import { Star, Loader2, Check } from "lucide-react";

interface AddLoyaltyPointsButtonProps {
  clientId: string;
  appointmentId: string;
  currentBalance: number;
}

export function AddLoyaltyPointsButton({
  clientId,
  appointmentId,
  currentBalance,
}: AddLoyaltyPointsButtonProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [balance, setBalance] = React.useState(currentBalance);
  const [justAdded, setJustAdded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleAdd() {
    setPending(true);
    setError(null);

    const result = await addLoyaltyPoints(
      clientId,
      10,
      `Post-visit bonus (appointment ${appointmentId})`
    );

    setPending(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setBalance(result.newTotal);
    setJustAdded(true);
    router.refresh();

    setTimeout(() => setJustAdded(false), 3000);
  }

  return (
    <div className="space-y-3">
      {/* Current balance display */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-4 py-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-yellow-500/20 flex-shrink-0">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground font-medium">Current balance</p>
          <p className="text-xl font-bold text-foreground leading-tight">
            {balance.toLocaleString()}{" "}
            <span className="text-sm font-normal text-muted-foreground">pts</span>
          </p>
        </div>
        {justAdded && (
          <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
            <Check className="w-3.5 h-3.5" />
            +10 added
          </div>
        )}
      </div>

      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={handleAdd}
        disabled={pending || justAdded}
      >
        {pending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Adding…
          </>
        ) : justAdded ? (
          <>
            <Check className="w-4 h-4 text-primary" />
            Points added!
          </>
        ) : (
          <>
            <Star className="w-4 h-4 text-yellow-500" />
            Add 10 Loyalty Points
          </>
        )}
      </Button>

      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Manually award bonus points to thank the client for their visit.
      </p>
    </div>
  );
}
