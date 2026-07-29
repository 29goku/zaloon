"use client";

import { useState, useTransition, useRef } from "react";
import { searchClients } from "@/app/actions/search";
import { addLoyaltyPoints, redeemLoyaltyPoints } from "@/app/actions/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Client = { id: string; name: string; phone: string | null };

type AdjType = "add" | "subtract";

interface PointsAdjustmentFormProps {
  onSuccess?: (clientName: string, points: number, type: AdjType) => void;
}

export function PointsAdjustmentForm({ onSuccess }: PointsAdjustmentFormProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [adjType, setAdjType] = useState<AdjType>("add");
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleQueryChange(val: string) {
    setQuery(val);
    setSelectedClient(null);
    setResults([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) return;
    debounceRef.current = setTimeout(async () => {
      const hits = await searchClients(val);
      setResults(hits);
    }, 250);
  }

  function selectClient(c: Client) {
    setSelectedClient(c);
    setQuery(c.name);
    setResults([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedClient) {
      setError("Please select a client.");
      return;
    }
    const pts = parseInt(points, 10);
    if (!pts || pts <= 0) {
      setError("Points must be a positive number.");
      return;
    }
    if (!reason.trim()) {
      setError("Please enter a reason.");
      return;
    }

    startTransition(async () => {
      let result;
      if (adjType === "add") {
        result = await addLoyaltyPoints(selectedClient.id, pts, reason);
      } else {
        result = await redeemLoyaltyPoints(selectedClient.id, pts);
      }

      if (!result.success) {
        setError(result.error);
        return;
      }

      const msg =
        adjType === "add"
          ? `Added ${pts} pts to ${selectedClient.name}. New total: ${result.newTotal}`
          : `Subtracted ${pts} pts from ${selectedClient.name}. New total: ${result.newTotal}`;
      setSuccess(msg);
      onSuccess?.(selectedClient.name, pts, adjType);

      // Reset
      setQuery("");
      setSelectedClient(null);
      setPoints("");
      setReason("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Client search */}
      <div className="relative">
        <Label htmlFor="client-search" className="text-sm font-medium">
          Client
        </Label>
        <Input
          id="client-search"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search by name or phone…"
          autoComplete="off"
          className="mt-1"
        />
        {results.length > 0 && (
          <ul className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
            {results.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => selectClient(c)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <span className="font-medium">{c.name}</span>
                  {c.phone && (
                    <span className="ml-2 text-muted-foreground text-xs">
                      {c.phone}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        {selectedClient && (
          <p className="mt-1 text-xs text-muted-foreground">
            Selected: <span className="font-medium text-foreground">{selectedClient.name}</span>
          </p>
        )}
      </div>

      {/* Type toggle */}
      <div>
        <Label className="text-sm font-medium">Type</Label>
        <div className="mt-1 flex rounded-xl border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setAdjType("add")}
            className={cn(
              "flex-1 py-2 text-sm font-semibold transition-colors",
              adjType === "add"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-muted-foreground hover:bg-muted"
            )}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setAdjType("subtract")}
            className={cn(
              "flex-1 py-2 text-sm font-semibold transition-colors",
              adjType === "subtract"
                ? "bg-destructive text-destructive-foreground"
                : "bg-transparent text-muted-foreground hover:bg-muted"
            )}
          >
            Subtract
          </button>
        </div>
      </div>

      {/* Points amount */}
      <div>
        <Label htmlFor="points-amount" className="text-sm font-medium">
          Points
        </Label>
        <Input
          id="points-amount"
          type="number"
          min={1}
          step={1}
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          placeholder="e.g. 50"
          className="mt-1"
        />
      </div>

      {/* Reason */}
      <div>
        <Label htmlFor="points-reason" className="text-sm font-medium">
          Reason
        </Label>
        <Textarea
          id="points-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Birthday bonus, referral reward…"
          rows={2}
          className="mt-1 resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive font-medium">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
          {success}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Saving…" : adjType === "add" ? "Add Points" : "Subtract Points"}
      </Button>
    </form>
  );
}
