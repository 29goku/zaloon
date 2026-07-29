"use client";

import { useState } from "react";

interface StaffOfMonthProps {
  name: string;
  revenue: string;
  appointments: number;
  initials: string;
  month: string;
}

export function StaffOfMonth({
  name,
  revenue,
  appointments,
  initials,
  month,
}: StaffOfMonthProps) {
  const [confetti, setConfetti] = useState(false);

  function handleCongratulate() {
    setConfetti(true);
    setTimeout(() => setConfetti(false), 2400);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-amber-600/5 border border-amber-500/30 p-6 mb-8">
      {/* Confetti burst */}
      {confetti && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="confetti-piece absolute text-lg select-none"
              style={
                {
                  "--angle": `${(i / 24) * 360}deg`,
                  "--dist": `${60 + Math.random() * 80}px`,
                  "--delay": `${Math.random() * 0.3}s`,
                  animation: "confetti-fly 0.9s ease-out var(--delay) forwards",
                  left: "50%",
                  top: "50%",
                } as React.CSSProperties
              }
            >
              {["🎉", "✨", "🌟", "🎊", "💫"][i % 5]}
            </span>
          ))}
        </div>
      )}

      <style>{`
        @keyframes confetti-fly {
          0%   { transform: translate(-50%, -50%) rotate(0deg); opacity: 1; }
          100% {
            transform: translate(
              calc(-50% + cos(var(--angle)) * var(--dist)),
              calc(-50% + sin(var(--angle)) * var(--dist))
            ) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Trophy + Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-amber-500/25 flex items-center justify-center text-amber-300 text-xl font-bold border-2 border-amber-500/40">
            {initials}
          </div>
          <span className="absolute -top-1 -right-1 text-xl">🏆</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-amber-400/80 uppercase tracking-widest mb-0.5">
            Staff of the Month — {month}
          </p>
          <p className="text-2xl font-bold text-foreground truncate">{name}</p>
          <div className="flex flex-wrap items-center gap-4 mt-1.5 text-sm text-muted-foreground">
            <span>
              <span className="text-foreground font-semibold">{revenue}</span>{" "}
              revenue
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span>
              <span className="text-foreground font-semibold">
                {appointments}
              </span>{" "}
              appointments
            </span>
          </div>
        </div>

        {/* Congratulate button */}
        <button
          onClick={handleCongratulate}
          className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 active:scale-95 transition-all"
        >
          Congratulate 🎉
        </button>
      </div>
    </div>
  );
}
