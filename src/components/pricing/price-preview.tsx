"use client";

import { useState, useTransition } from "react";
import { calculateDynamicPrice } from "@/app/actions/pricing-rules";

interface Service {
  id: string;
  name: string;
  price: number;
}

interface PricePreviewProps {
  services: Service[];
  currency?: string | null;
}

function fmt(n: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

export function PricePreview({ services, currency = "USD" }: PricePreviewProps) {
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [result, setResult] = useState<{
    basePrice: number;
    finalPrice: number;
    appliedRules: { name: string; adjustment: number }[];
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const cur = currency ?? "USD";

  function handlePreview() {
    if (!serviceId || !date || !time) return;
    startTransition(async () => {
      const r = await calculateDynamicPrice(serviceId, date, time);
      setResult(r);
    });
  }

  const diff = result ? result.finalPrice - result.basePrice : 0;
  const hasDiff = result && Math.abs(diff) > 0.001;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Price Preview</h3>

      <div className="space-y-3">
        {/* Service selector */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Service</label>
          <select
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              setResult(null);
            }}
            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Select a service…</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {fmt(s.price, cur)}
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setResult(null);
            }}
            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Time */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Time</label>
          <input
            type="time"
            value={time}
            onChange={(e) => {
              setTime(e.target.value);
              setResult(null);
            }}
            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <button
          type="button"
          onClick={handlePreview}
          disabled={!serviceId || !date || !time || isPending}
          className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? "Calculating…" : "Preview Price"}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Base price</span>
            <span className="font-medium text-foreground">{fmt(result.basePrice, cur)}</span>
          </div>

          {result.appliedRules.length > 0 && (
            <div className="space-y-1.5 border-t border-border pt-2">
              {result.appliedRules.map((rule, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate">{rule.name}</span>
                  <span
                    className={
                      rule.adjustment >= 0 ? "text-red-400 font-medium" : "text-green-400 font-medium"
                    }
                  >
                    {rule.adjustment >= 0 ? "+" : ""}
                    {fmt(rule.adjustment, cur)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="text-sm font-semibold text-foreground">Final price</span>
            <div className="flex items-center gap-2">
              {hasDiff && (
                <span className="text-xs line-through text-muted-foreground">
                  {fmt(result.basePrice, cur)}
                </span>
              )}
              <span
                className={[
                  "text-base font-bold",
                  hasDiff && diff < 0 ? "text-green-400" : hasDiff && diff > 0 ? "text-red-400" : "text-foreground",
                ].join(" ")}
              >
                {fmt(result.finalPrice, cur)}
              </span>
            </div>
          </div>

          {result.appliedRules.length === 0 && (
            <p className="text-xs text-muted-foreground text-center">No pricing rules apply at this time.</p>
          )}
        </div>
      )}
    </div>
  );
}
