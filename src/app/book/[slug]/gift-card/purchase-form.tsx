"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { purchaseGiftCard } from "@/app/actions/gift-cards";

const PRESET_AMOUNTS = [25, 50, 75, 100, 150, 200];

interface PurchaseFormProps {
  salonSlug: string;
  salonName: string;
  salonUrl: string;
}

export function PurchaseForm({ salonSlug, salonName, salonUrl }: PurchaseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Step tracking: 1 = amount, 2 = recipient, 3 = your info
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form state
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [customError, setCustomError] = useState("");

  const [recipientName, setRecipientName] = useState("");
  const [fromName, setFromName] = useState("");
  const [message, setMessage] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [purchaserEmail, setPurchaserEmail] = useState("");

  const [error, setError] = useState("");
  const [result, setResult] = useState<{ code: string; id: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const codeRef = useRef<HTMLSpanElement>(null);

  const finalAmount = selectedAmount ?? (customAmount ? parseFloat(customAmount) : null);

  function handlePresetClick(amount: number) {
    setSelectedAmount(amount);
    setCustomAmount("");
    setCustomError("");
  }

  function handleCustomChange(val: string) {
    setCustomAmount(val);
    setSelectedAmount(null);
    if (val && parseFloat(val) < 10) {
      setCustomError("Minimum amount is $10");
    } else {
      setCustomError("");
    }
  }

  function canProceedStep1() {
    if (!finalAmount) return false;
    if (finalAmount < 10) return false;
    return true;
  }

  function handleSubmit() {
    if (!finalAmount || finalAmount < 10) {
      setError("Please select or enter a valid amount (minimum $10)");
      return;
    }
    setError("");
    startTransition(async () => {
      const res = await purchaseGiftCard({
        salonSlug,
        amount: finalAmount,
        recipientName: recipientName.trim() || undefined,
        fromName: fromName.trim() || undefined,
        message: message.trim() || undefined,
        recipientEmail: recipientEmail.trim() || undefined,
        purchaserEmail: purchaserEmail.trim() || undefined,
      });

      if (res.success) {
        setResult({ code: res.code, id: res.id });
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function copyCode() {
    if (!result) return;
    navigator.clipboard.writeText(result.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (result) {
    const shareText = `Use code ${result.code} at ${salonName} — ${salonUrl}`;
    return (
      <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center">
        {/* CSS confetti */}
        <style>{`
          @keyframes confettiFall {
            0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
          .confetti-piece {
            position: absolute;
            width: 10px;
            height: 10px;
            border-radius: 2px;
            animation: confettiFall linear forwards;
          }
        `}</style>
        {[...Array(18)].map((_, i) => (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${(i * 5.5 + 2) % 100}%`,
              top: "-12px",
              backgroundColor: ["#f59e0b", "#f97316", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"][i % 6],
              animationDuration: `${1.8 + (i % 5) * 0.4}s`,
              animationDelay: `${(i % 7) * 0.15}s`,
              width: `${8 + (i % 4) * 4}px`,
              height: `${8 + (i % 3) * 3}px`,
            }}
          />
        ))}

        <div className="relative z-10 space-y-5">
          {/* Gift icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-4xl">
            🎁
          </div>

          <div>
            <h2 className="text-2xl font-bold text-stone-900">Gift Card Purchased!</h2>
            <p className="text-stone-500 text-sm mt-1">
              {recipientName
                ? `A $${finalAmount!.toFixed(2)} gift card for ${recipientName}`
                : `Your $${finalAmount!.toFixed(2)} gift card is ready`}
            </p>
          </div>

          {/* Code display */}
          <div className="rounded-xl border-2 border-amber-300 bg-white p-5 space-y-2">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest">
              Your gift card code
            </p>
            <span
              ref={codeRef}
              className="block text-3xl font-mono font-bold tracking-[0.25em] text-stone-900 select-all"
            >
              {result.code}
            </span>
            <button
              onClick={copyCode}
              className="mt-1 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-medium transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy code
                </>
              )}
            </button>
          </div>

          {/* Share text */}
          <div className="rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-600 font-mono break-all">
            {shareText}
          </div>

          <p className="text-xs text-stone-400">
            💡 Screenshot or print this page to save your code
          </p>

          {/* Check balance link */}
          <a
            href={`/book/${salonSlug}/gift-card/check`}
            className="inline-block text-sm text-amber-700 underline underline-offset-2 hover:text-amber-800"
          >
            Check gift card balance →
          </a>
        </div>
      </div>
    );
  }

  // ── Step indicator ──────────────────────────────────────────────────────────
  const steps = ["Amount", "Recipient", "Your Info"];
  const currentStepIdx = (step as number) - 1;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {steps.map((label, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => {
                if (i + 1 < (step as number)) setStep((i + 1) as 1 | 2 | 3);
              }}
              disabled={i + 1 >= (step as number)}
              className="flex items-center gap-2 group"
            >
              <span
                className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                  i < currentStepIdx
                    ? "bg-green-500 text-white"
                    : i === currentStepIdx
                    ? "bg-amber-500 text-white"
                    : "bg-stone-200 text-stone-400"
                }`}
              >
                {i < currentStepIdx ? "✓" : i + 1}
              </span>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  i === currentStepIdx ? "text-amber-700" : i < currentStepIdx ? "text-green-700" : "text-stone-400"
                }`}
              >
                {label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 rounded-full ${
                  i < currentStepIdx ? "bg-green-300" : "bg-stone-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Amount ── */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Choose an amount</h2>
            <p className="text-sm text-stone-500">Select a preset or enter a custom value</p>
          </div>

          {/* Preset amounts */}
          <div className="grid grid-cols-3 gap-3">
            {PRESET_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => handlePresetClick(amt)}
                className={`rounded-xl border-2 py-4 font-bold text-lg transition-all ${
                  selectedAmount === amt
                    ? "border-amber-500 bg-amber-50 text-amber-700 shadow-md shadow-amber-100 scale-105"
                    : "border-stone-200 text-stone-700 hover:border-amber-300 hover:bg-amber-50/50"
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-stone-700">Or enter a custom amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-semibold">$</span>
              <input
                type="number"
                min="10"
                step="1"
                placeholder="e.g. 35"
                value={customAmount}
                onChange={(e) => handleCustomChange(e.target.value)}
                className={`w-full rounded-xl border-2 pl-7 pr-4 py-3 text-stone-900 text-lg font-semibold outline-none transition-colors focus:border-amber-400 ${
                  customError ? "border-red-300 bg-red-50" : "border-stone-200"
                } ${selectedAmount === null && customAmount ? "border-amber-400 bg-amber-50" : ""}`}
              />
            </div>
            {customError && <p className="text-xs text-red-500">{customError}</p>}
          </div>

          {/* Selected amount display */}
          {finalAmount && finalAmount >= 10 && (
            <div className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 px-5 py-3 flex items-center justify-between">
              <span className="text-amber-50 font-medium">Gift card value</span>
              <span className="text-white text-2xl font-bold">${finalAmount.toFixed(2)}</span>
            </div>
          )}

          <button
            onClick={() => setStep(2)}
            disabled={!canProceedStep1()}
            className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-stone-200 disabled:text-stone-400 text-white font-semibold py-3.5 transition-colors"
          >
            Continue →
          </button>
        </div>
      )}

      {/* ── Step 2: Recipient ── */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Recipient details</h2>
            <p className="text-sm text-stone-500">Tell us who this gift is for</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700">Recipient name</label>
              <input
                type="text"
                placeholder="e.g. Sarah"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full rounded-xl border-2 border-stone-200 px-4 py-3 text-stone-900 outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700">From (your name)</label>
              <input
                type="text"
                placeholder="e.g. Alex"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className="w-full rounded-xl border-2 border-stone-200 px-4 py-3 text-stone-900 outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700">
                Personal message <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                maxLength={200}
                placeholder="Write a short note to the recipient…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-xl border-2 border-stone-200 px-4 py-3 text-stone-900 outline-none focus:border-amber-400 transition-colors resize-none"
              />
              <p className="text-xs text-stone-400 text-right">{message.length}/200</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700">
                Recipient email <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <input
                type="email"
                placeholder="recipient@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full rounded-xl border-2 border-stone-200 px-4 py-3 text-stone-900 outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 rounded-xl border-2 border-stone-200 text-stone-700 font-semibold py-3 hover:bg-stone-50 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-[2] rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 transition-colors"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Purchaser email ── */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Your email</h2>
            <p className="text-sm text-stone-500">
              Your gift card code will appear on screen after purchase
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700">
              Your email address <span className="text-stone-400 font-normal">(optional, for receipt)</span>
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={purchaserEmail}
              onChange={(e) => setPurchaserEmail(e.target.value)}
              className="w-full rounded-xl border-2 border-stone-200 px-4 py-3 text-stone-900 outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          {/* Summary card */}
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-600">Gift card value</span>
              <span className="font-bold text-amber-700">${finalAmount!.toFixed(2)}</span>
            </div>
            {recipientName && (
              <div className="flex justify-between">
                <span className="text-stone-600">For</span>
                <span className="text-stone-800">{recipientName}</span>
              </div>
            )}
            {fromName && (
              <div className="flex justify-between">
                <span className="text-stone-600">From</span>
                <span className="text-stone-800">{fromName}</span>
              </div>
            )}
            <div className="border-t border-amber-200 pt-2 flex justify-between font-bold">
              <span className="text-stone-700">Total</span>
              <span className="text-amber-700">${finalAmount!.toFixed(2)}</span>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              disabled={isPending}
              className="flex-1 rounded-xl border-2 border-stone-200 text-stone-700 font-semibold py-3 hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex-[2] rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold py-3.5 transition-colors flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing…
                </>
              ) : (
                `Purchase Gift Card → $${finalAmount!.toFixed(2)}`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
