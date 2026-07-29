"use client";

import { useState, useTransition } from "react";
import { checkGiftCardBalance } from "@/app/actions/gift-cards";

interface BalanceResult {
  balance: number;
  initialValue: number;
  status: string;
  expiresAt: string | null;
  recipientName: string | null;
}

function statusColor(status: string) {
  switch (status) {
    case "ACTIVE":
      return "text-green-700 bg-green-100 border-green-200";
    case "REDEEMED":
      return "text-blue-700 bg-blue-100 border-blue-200";
    case "EXPIRED":
      return "text-amber-700 bg-amber-100 border-amber-200";
    case "VOIDED":
      return "text-red-700 bg-red-100 border-red-200";
    default:
      return "text-stone-700 bg-stone-100 border-stone-200";
  }
}

export function BalanceChecker() {
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<BalanceResult | null>(null);
  const [error, setError] = useState("");

  function handleCheck() {
    if (!code.trim()) {
      setError("Please enter your gift card code");
      return;
    }
    setError("");
    setResult(null);
    startTransition(async () => {
      const res = await checkGiftCardBalance(code.trim());
      if (res.success) {
        setResult({
          balance: res.balance,
          initialValue: res.initialValue,
          status: res.status,
          expiresAt: res.expiresAt,
          recipientName: res.recipientName,
        });
      } else {
        setError(res.error);
      }
    });
  }

  const pct =
    result && result.initialValue > 0
      ? Math.round((result.balance / result.initialValue) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-stone-700">
          Gift card code
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. ABCD1234EFGH"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
            className="flex-1 rounded-xl border-2 border-stone-200 px-4 py-3 font-mono text-stone-900 text-base outline-none focus:border-amber-400 transition-colors tracking-widest"
          />
          <button
            onClick={handleCheck}
            disabled={isPending}
            className="rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold px-5 py-3 transition-colors whitespace-nowrap flex items-center gap-2"
          >
            {isPending ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              "Check Balance"
            )}
          </button>
        </div>
        <p className="text-xs text-stone-400">Enter the code exactly as it appears — it is not case-sensitive</p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5 space-y-4">
          {/* Balance */}
          <div className="text-center space-y-1">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest">Available Balance</p>
            <p className="text-5xl font-bold text-stone-900">${result.balance.toFixed(2)}</p>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-stone-500">
              <span>Used: ${(result.initialValue - result.balance).toFixed(2)}</span>
              <span>Original: ${result.initialValue.toFixed(2)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-stone-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-stone-400 text-right">{pct}% remaining</p>
          </div>

          {/* Details */}
          <div className="border-t border-amber-200 pt-4 space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-stone-600">Status</span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColor(result.status)}`}
              >
                {result.status}
              </span>
            </div>

            {result.recipientName && (
              <div className="flex justify-between">
                <span className="text-stone-600">Recipient</span>
                <span className="text-stone-800 font-medium">{result.recipientName}</span>
              </div>
            )}

            {result.expiresAt ? (
              <div className="flex justify-between">
                <span className="text-stone-600">Expires</span>
                <span className="text-stone-800 font-medium">{result.expiresAt}</span>
              </div>
            ) : (
              <div className="flex justify-between">
                <span className="text-stone-600">Expires</span>
                <span className="text-green-700 font-medium">No expiry</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
