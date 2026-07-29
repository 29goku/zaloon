"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, Info } from "lucide-react";

const STORAGE_KEY = "zaloon_breakeven_inputs";

interface BreakevenInputs {
  fixedCosts: number;
  variableCostPct: number;
  staffCount: number;
  avgApptValue: number;
}

interface Props {
  currency: string;
  defaultAvgValue: number;
  defaultStaffCount: number;
  totalInvoices: number;
}

// ── SVG Profitability Chart ────────────────────────────────────────────────────

function ProfitabilityChart({
  inputs,
  breakevenAppts,
  currency,
}: {
  inputs: BreakevenInputs;
  breakevenAppts: number;
  currency: string;
}) {
  const W = 600;
  const H = 240;
  const PAD_LEFT = 68;
  const PAD_RIGHT = 20;
  const PAD_TOP = 16;
  const PAD_BOTTOM = 44;
  const innerW = W - PAD_LEFT - PAD_RIGHT;
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  // X-axis: 0 to maxAppts (2x breakeven or 200, whichever is larger)
  const maxAppts = Math.max(Math.ceil(breakevenAppts * 2.5), 200);
  const POINTS = 12;

  const revPoints: [number, number][] = [];
  const costPoints: [number, number][] = [];

  let maxY = inputs.fixedCosts;
  for (let i = 0; i <= POINTS; i++) {
    const appts = (i / POINTS) * maxAppts;
    const rev = appts * inputs.avgApptValue;
    const costs =
      inputs.fixedCosts + appts * inputs.avgApptValue * (inputs.variableCostPct / 100);
    maxY = Math.max(maxY, rev, costs);
    revPoints.push([appts, rev]);
    costPoints.push([appts, costs]);
  }

  const niceCeil = Math.ceil(maxY / 1000) * 1000 || 1;
  const GRIDLINES = 5;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      minimumFractionDigits: 0,
    }).format(n);

  const xOf = (appts: number) =>
    PAD_LEFT + (appts / maxAppts) * innerW;

  const yOf = (val: number) =>
    PAD_TOP + innerH - (val / niceCeil) * innerH;

  const toSvgPts = (pts: [number, number][]) =>
    pts.map(([a, v]) => `${xOf(a).toFixed(1)},${yOf(v).toFixed(1)}`).join(" ");

  // Breakeven x marker
  const beX = xOf(breakevenAppts);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minWidth: "360px" }}
        aria-label="Profitability chart"
      >
        {/* Gridlines */}
        {Array.from({ length: GRIDLINES + 1 }, (_, gi) => {
          const v = (gi / GRIDLINES) * niceCeil;
          const gy = yOf(v);
          return (
            <g key={`grid-${gi}`}>
              <line
                x1={PAD_LEFT}
                y1={gy}
                x2={W - PAD_RIGHT}
                y2={gy}
                stroke="currentColor"
                strokeWidth="0.5"
                strokeDasharray="4 4"
                className="text-border"
              />
              <text
                x={PAD_LEFT - 5}
                y={gy + 4}
                textAnchor="end"
                fontSize="9"
                className="fill-muted-foreground"
              >
                {fmt(v)}
              </text>
            </g>
          );
        })}

        {/* Breakeven vertical */}
        {breakevenAppts > 0 && breakevenAppts <= maxAppts && (
          <line
            x1={beX}
            y1={PAD_TOP}
            x2={beX}
            y2={PAD_TOP + innerH}
            stroke="#F48E16"
            strokeWidth="1.5"
            strokeDasharray="5 3"
          />
        )}

        {/* Revenue line (emerald) */}
        <polyline
          points={toSvgPts(revPoints)}
          fill="none"
          stroke="#10B981"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Cost line (rose) */}
        <polyline
          points={toSvgPts(costPoints)}
          fill="none"
          stroke="#F43F5E"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* X-axis labels */}
        {Array.from({ length: 6 }, (_, i) => {
          const appts = Math.round((i / 5) * maxAppts);
          return (
            <text
              key={`xl-${i}`}
              x={xOf(appts)}
              y={H - 6}
              textAnchor="middle"
              fontSize="9"
              className="fill-muted-foreground"
            >
              {appts}
            </text>
          );
        })}

        {/* X-axis label */}
        <text
          x={PAD_LEFT + innerW / 2}
          y={H - 0}
          textAnchor="middle"
          fontSize="9"
          className="fill-muted-foreground/60"
        />
      </svg>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function BreakevenCalculator({
  currency,
  defaultAvgValue,
  defaultStaffCount,
  totalInvoices,
}: Props) {
  const [inputs, setInputs] = useState<BreakevenInputs>({
    fixedCosts: 3000,
    variableCostPct: 20,
    staffCount: defaultStaffCount,
    avgApptValue: defaultAvgValue || 80,
  });

  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as BreakevenInputs;
        setInputs((prev) => ({
          ...prev,
          ...parsed,
          // Keep DB-fetched avg if we have invoice data and user hasn't overridden
          avgApptValue: parsed.avgApptValue || prev.avgApptValue,
        }));
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
    } catch {
      // ignore
    }
  }, [inputs, hydrated]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  // ── Calculations ──────────────────────────────────────────────────────────

  const revenuePerAppt = inputs.avgApptValue;
  const variableCostPerAppt =
    revenuePerAppt * (inputs.variableCostPct / 100);
  const contributionMargin = revenuePerAppt - variableCostPerAppt;

  const breakevenAppts =
    contributionMargin > 0
      ? Math.ceil(inputs.fixedCosts / contributionMargin)
      : Infinity;

  const breakevenRevenue =
    breakevenAppts === Infinity ? Infinity : breakevenAppts * revenuePerAppt;

  const WORKING_DAYS = 25;
  const breakevenPerDay =
    breakevenAppts === Infinity
      ? Infinity
      : Math.ceil(breakevenAppts / WORKING_DAYS);

  const isValid = contributionMargin > 0 && isFinite(breakevenAppts);

  const outputCards = [
    {
      label: "Break-even Appointments/Month",
      value: isValid ? `${breakevenAppts} appts` : "N/A",
      sub: "Total appointments needed to cover all costs",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Break-even Revenue/Month",
      value: isValid ? fmt(breakevenRevenue) : "N/A",
      sub: "Minimum monthly revenue to break even",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Break-even Appointments/Day",
      value: isValid ? `${breakevenPerDay} appts` : "N/A",
      sub: `Assuming ${WORKING_DAYS} working days per month`,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Contribution Margin",
      value:
        contributionMargin > 0
          ? `${fmt(contributionMargin)} / appt`
          : "Negative",
      sub: `Revenue − variable costs per appointment`,
      color: contributionMargin > 0 ? "text-emerald-500" : "text-rose-500",
      bg: contributionMargin > 0 ? "bg-emerald-500/10" : "bg-rose-500/10",
    },
  ];

  const inputFields: {
    key: keyof BreakevenInputs;
    label: string;
    sub: string;
    min: number;
    max: number;
    step: number;
    suffix?: string;
    prefix?: string;
    fromDb?: boolean;
  }[] = [
    {
      key: "fixedCosts",
      label: "Fixed Monthly Costs",
      sub: "Rent, utilities, insurance, etc.",
      min: 0,
      max: 50000,
      step: 100,
      prefix: currency,
    },
    {
      key: "variableCostPct",
      label: "Variable Cost %",
      sub: "Supplies and products as % of revenue",
      min: 0,
      max: 80,
      step: 1,
      suffix: "%",
    },
    {
      key: "staffCount",
      label: "Staff Count",
      sub: "Number of active staff members",
      min: 1,
      max: 100,
      step: 1,
    },
    {
      key: "avgApptValue",
      label: "Avg Appointment Value",
      sub:
        totalInvoices > 0
          ? `Auto-fetched from ${totalInvoices} invoices — override if needed`
          : "Enter average revenue per appointment",
      min: 1,
      max: 10000,
      step: 5,
      prefix: currency,
      fromDb: totalInvoices > 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Inputs
            <span className="ml-auto text-xs font-normal text-muted-foreground flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              Saved to browser
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {inputFields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    {field.label}
                    {field.fromDb && (
                      <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">
                        From DB
                      </span>
                    )}
                  </label>
                  <span className="text-sm font-bold text-foreground tabular-nums">
                    {field.prefix && `${field.prefix} `}
                    {inputs[field.key]}
                    {field.suffix}
                  </span>
                </div>
                <input
                  type="range"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={inputs[field.key]}
                  onChange={(e) =>
                    setInputs((prev) => ({
                      ...prev,
                      [field.key]: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-primary"
                />
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={inputs[field.key]}
                  onChange={(e) =>
                    setInputs((prev) => ({
                      ...prev,
                      [field.key]: Number(e.target.value),
                    }))
                  }
                  className="w-full h-8 rounded-lg border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                />
                <p className="text-xs text-muted-foreground">{field.sub}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Output KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {outputCards.map((card) => (
          <Card key={card.label} className="bg-card border-border">
            <CardContent className="pt-5 pb-4">
              <div
                className={`w-9 h-9 rounded-full ${card.bg} flex items-center justify-center mb-3`}
              >
                <Activity className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className={`text-xl font-bold tabular-nums ${card.color}`}>
                {card.value}
              </p>
              <p className="text-xs font-medium text-foreground mt-1">{card.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Profitability chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Revenue vs. Costs Chart
          </CardTitle>
          <div className="flex items-center gap-6 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-500 inline-block rounded" />
              Revenue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-rose-500 inline-block rounded" />
              Total Costs
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" aria-hidden="true">
                <line x1="6" y1="0" x2="6" y2="12" stroke="#F48E16" strokeWidth="1.5" strokeDasharray="4 2" />
              </svg>
              Break-even
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {!isValid ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Variable cost % is too high — contribution margin is negative.
              <br />
              Reduce variable costs or increase appointment value.
            </div>
          ) : (
            <ProfitabilityChart
              inputs={inputs}
              breakevenAppts={breakevenAppts}
              currency={currency}
            />
          )}
        </CardContent>
      </Card>

      {/* Summary assumptions */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground">
            Assumptions &amp; Formula
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2 text-muted-foreground">
              <p>
                <strong className="text-foreground">Break-even appts</strong> = Fixed Costs ÷ (Avg Value − Variable Cost per Appt)
              </p>
              <p>
                <strong className="text-foreground">Variable cost per appt</strong> = Avg Value × Variable Cost %
              </p>
              <p>
                <strong className="text-foreground">Working days</strong> = 25 per month assumed
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fixed costs</span>
                <span className="font-medium text-foreground">{fmt(inputs.fixedCosts)}/month</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Variable cost/appt</span>
                <span className="font-medium text-foreground">
                  {fmt(inputs.avgApptValue * (inputs.variableCostPct / 100))}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Contribution margin</span>
                <span className={`font-bold ${contributionMargin > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {fmt(contributionMargin)}/appt
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
