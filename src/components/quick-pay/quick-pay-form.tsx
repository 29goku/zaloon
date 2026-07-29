"use client";

import { useState, useRef, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Minus, CheckCircle, Search, X } from "lucide-react";
import { createQuickPayment } from "@/app/actions/payments";
import { searchClients } from "@/app/actions/search";
import type { RecentInvoice } from "@/app/dashboard/quick-pay/page";

const QUICK_AMOUNTS = [10, 20, 50, 100, 200, 500];

type Method = "CASH" | "CARD" | "UPI" | "TRANSFER";

interface SelectedClient {
  id: string;
  name: string;
  phone: string | null;
}

interface Props {
  onPaymentCreated: (invoice: RecentInvoice) => void;
}

export function QuickPayForm({ onPaymentCreated }: Props) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("CASH");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client search state
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<SelectedClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<SelectedClient | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPending, startTransition] = useTransition();

  const methods: { id: Method; label: string; emoji: string }[] = [
    { id: "CASH", label: "Cash", emoji: "💵" },
    { id: "CARD", label: "Card", emoji: "💳" },
    { id: "UPI", label: "UPI / Scan", emoji: "📱" },
    { id: "TRANSFER", label: "Transfer", emoji: "🏦" },
  ];

  const handleClientSearch = (q: string) => {
    setClientQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) {
      setClientResults([]);
      setShowDropdown(false);
      return;
    }
    searchTimeout.current = setTimeout(() => {
      startTransition(async () => {
        const results = await searchClients(q);
        setClientResults(results);
        setShowDropdown(true);
      });
    }, 250);
  };

  const selectClient = (client: SelectedClient) => {
    setSelectedClient(client);
    setClientQuery("");
    setClientResults([]);
    setShowDropdown(false);
  };

  const clearClient = () => {
    setSelectedClient(null);
    setClientQuery("");
  };

  const handleSubmit = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    setError(null);

    const numAmount = Number(amount);
    const noteVal = note.trim() || undefined;
    const clientId = selectedClient?.id;

    startTransition(async () => {
      const result = await createQuickPayment({
        amount: numAmount,
        method,
        note: noteVal,
        clientId,
      });

      if (result.success) {
        onPaymentCreated(result.invoice);
        setDone(true);
        setTimeout(() => {
          setAmount("");
          setNote("");
          setMethod("CASH");
          setSelectedClient(null);
          setClientQuery("");
          setDone(false);
        }, 2000);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Enter Amount</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Amount display */}
          <div className="bg-secondary rounded-2xl p-6 text-center">
            <p className="text-muted-foreground text-sm mb-2">Amount</p>
            <p className="text-5xl font-bold text-foreground">
              {amount ? `$${amount}` : "$0"}
            </p>
          </div>

          {/* Quick amount chips */}
          <div className="grid grid-cols-3 gap-2">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(String(a))}
                className="py-2.5 rounded-xl bg-secondary text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                ${a}
              </button>
            ))}
          </div>

          {/* Custom input */}
          <div className="flex gap-2">
            <button
              onClick={() => setAmount((v) => String(Math.max(0, Number(v) - 1)))}
              className="p-3 rounded-xl bg-secondary hover:bg-secondary/70 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Custom amount"
              className="flex-1 bg-secondary text-foreground rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
            />
            <button
              onClick={() => setAmount((v) => String(Number(v) + 1))}
              className="p-3 rounded-xl bg-secondary hover:bg-secondary/70 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Client search */}
          <div className="relative">
            <p className="text-sm text-muted-foreground mb-2">Client (optional)</p>
            {selectedClient ? (
              <div className="flex items-center bg-secondary rounded-xl px-4 py-3 text-sm gap-2">
                <span className="font-medium text-foreground flex-1">{selectedClient.name}</span>
                {selectedClient.phone && (
                  <span className="text-muted-foreground text-xs">{selectedClient.phone}</span>
                )}
                <button onClick={clearClient} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={clientQuery}
                  onChange={(e) => handleClientSearch(e.target.value)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  onFocus={() => clientResults.length > 0 && setShowDropdown(true)}
                  placeholder="Search by name or phone..."
                  className="w-full bg-secondary text-foreground rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                />
                {showDropdown && clientResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-10 overflow-hidden">
                    {clientResults.map((c) => (
                      <button
                        key={c.id}
                        onMouseDown={() => selectClient(c)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-secondary text-left transition-colors"
                      >
                        <span className="font-medium text-foreground">{c.name}</span>
                        {c.phone && (
                          <span className="text-muted-foreground text-xs">{c.phone}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment method */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Payment Method</p>
            <div className="grid grid-cols-2 gap-2">
              {methods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium transition-colors ${
                    method === m.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/70"
                  }`}
                >
                  <span>{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
          />

          {/* Error */}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!amount || done || isPending}
            className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
              done
                ? "bg-primary/50 text-primary-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            }`}
          >
            {done ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Payment Recorded!
              </span>
            ) : isPending ? (
              "Saving..."
            ) : (
              `Collect ${amount ? `$${amount}` : "Payment"}`
            )}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
