"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Plus, Minus, CheckCircle } from "lucide-react";

const QUICK_AMOUNTS = [10, 20, 50, 100, 200, 500];

type Method = "CASH" | "CARD" | "UPI" | "TRANSFER";

export default function QuickPayPage() {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("CASH");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);

  const methods: { id: Method; label: string; emoji: string }[] = [
    { id: "CASH", label: "Cash", emoji: "💵" },
    { id: "CARD", label: "Card", emoji: "💳" },
    { id: "UPI", label: "UPI / Scan", emoji: "📱" },
    { id: "TRANSFER", label: "Transfer", emoji: "🏦" },
  ];

  const handleSubmit = () => {
    if (!amount || isNaN(Number(amount))) return;
    setDone(true);
    setTimeout(() => {
      setAmount("");
      setNote("");
      setMethod("CASH");
      setDone(false);
    }, 2000);
  };

  return (
    <div className="p-8 max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Zap className="w-7 h-7 text-primary" />
          Quick Pay
        </h1>
        <p className="text-muted-foreground mt-1">Fast payment collection</p>
      </div>

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
              onClick={() =>
                setAmount((v) => String(Math.max(0, Number(v) - 1)))
              }
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
              onClick={() =>
                setAmount((v) => String(Number(v) + 1))
              }
              className="p-3 rounded-xl bg-secondary hover:bg-secondary/70 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
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

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!amount || done}
            className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
              done
                ? "bg-primary/50 text-primary-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
            }`}
          >
            {done ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Payment Recorded!
              </span>
            ) : (
              `Collect ${amount ? `$${amount}` : "Payment"}`
            )}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
