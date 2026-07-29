"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Moon,
  Clock,
  Calendar,
  CalendarRange,
  Star,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import {
  togglePricingRule,
  deletePricingRule,
  type PricingRule,
} from "@/app/actions/pricing-rules";
import { RuleWizard } from "./rule-wizard";

interface Service {
  id: string;
  name: string;
  categoryName: string;
}

interface PricingRulesClientProps {
  rules: PricingRule[];
  services: Service[];
  currency: string;
}

const TYPE_META: Record<
  PricingRule["type"],
  { label: string; icon: React.ElementType; color: string }
> = {
  peak: { label: "Peak Hours", icon: Zap, color: "text-amber-400 bg-amber-400/10" },
  offpeak: { label: "Off-Peak", icon: Moon, color: "text-blue-400 bg-blue-400/10" },
  lastminute: { label: "Last-Minute", icon: Clock, color: "text-violet-400 bg-violet-400/10" },
  advance: { label: "Advance", icon: Calendar, color: "text-sky-400 bg-sky-400/10" },
  day_of_week: { label: "Day of Week", icon: Star, color: "text-rose-400 bg-rose-400/10" },
  seasonal: { label: "Seasonal", icon: CalendarRange, color: "text-emerald-400 bg-emerald-400/10" },
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function scheduleLabel(rule: PricingRule): string {
  const parts: string[] = [];
  if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
    parts.push(rule.daysOfWeek.map((d) => DAY_NAMES[d]).join(", "));
  }
  if (rule.timeRangeStart && rule.timeRangeEnd) {
    parts.push(`${rule.timeRangeStart}–${rule.timeRangeEnd}`);
  }
  if (rule.advanceDays) parts.push(`${rule.advanceDays}d advance`);
  if (rule.lastMinuteHours) parts.push(`within ${rule.lastMinuteHours}h`);
  if (rule.dateRangeStart && rule.dateRangeEnd) {
    parts.push(`${rule.dateRangeStart} → ${rule.dateRangeEnd}`);
  }
  return parts.join(" · ") || "All times";
}

function adjustmentDisplay(rule: PricingRule, currency: string): { text: string; positive: boolean } {
  const sign = rule.adjustmentValue >= 0 ? "+" : "";
  if (rule.adjustmentType === "percent") {
    return { text: `${sign}${rule.adjustmentValue}%`, positive: rule.adjustmentValue >= 0 };
  }
  try {
    const fmt = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(Math.abs(rule.adjustmentValue));
    return {
      text: `${sign}${fmt}`,
      positive: rule.adjustmentValue >= 0,
    };
  } catch {
    return { text: `${sign}$${rule.adjustmentValue.toFixed(2)}`, positive: rule.adjustmentValue >= 0 };
  }
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none flex-shrink-0",
        checked ? "bg-primary" : "bg-muted",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-4.5" : "translate-x-0.5",
        ].join(" ")}
      />
    </button>
  );
}

export function PricingRulesClient({
  rules,
  services,
  currency,
}: PricingRulesClientProps) {
  const router = useRouter();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editRule, setEditRule] = useState<PricingRule | null>(null);
  const [toggling, startToggleTransition] = useTransition();
  const [deleting, startDeleteTransition] = useTransition();

  function handleToggle(id: string, active: boolean) {
    startToggleTransition(async () => {
      await togglePricingRule(id, active);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this pricing rule?")) return;
    startDeleteTransition(async () => {
      await deletePricingRule(id);
      router.refresh();
    });
  }

  function handleEdit(rule: PricingRule) {
    setEditRule(rule);
    setWizardOpen(true);
  }

  function handleCreate() {
    setEditRule(null);
    setWizardOpen(true);
  }

  const activeRules = rules.filter((r) => r.active);
  const inactiveRules = rules.filter((r) => !r.active);

  return (
    <>
      {/* Header action */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dynamic Pricing</h1>
          <p className="text-muted-foreground mt-1">
            {rules.length} rule{rules.length !== 1 ? "s" : ""}
            {activeRules.length > 0 ? ` · ${activeRules.length} active` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-24">
          <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">No pricing rules yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Create rules to automatically adjust prices for peak hours, special deals, and more.
          </p>
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Create your first rule
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active rules */}
          {activeRules.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Active ({activeRules.length})
              </h2>
              <div className="space-y-3">
                {activeRules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    currency={currency}
                    onToggle={handleToggle}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    toggling={toggling}
                    deleting={deleting}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Inactive rules */}
          {inactiveRules.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Inactive ({inactiveRules.length})
              </h2>
              <div className="space-y-3 opacity-60">
                {inactiveRules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    currency={currency}
                    onToggle={handleToggle}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    toggling={toggling}
                    deleting={deleting}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {wizardOpen && (
        <RuleWizard
          services={services}
          editRule={editRule}
          onClose={() => {
            setWizardOpen(false);
            setEditRule(null);
          }}
        />
      )}
    </>
  );
}

function RuleCard({
  rule,
  currency,
  onToggle,
  onEdit,
  onDelete,
  toggling,
  deleting,
}: {
  rule: PricingRule;
  currency: string;
  onToggle: (id: string, active: boolean) => void;
  onEdit: (rule: PricingRule) => void;
  onDelete: (id: string) => void;
  toggling: boolean;
  deleting: boolean;
}) {
  const meta = TYPE_META[rule.type];
  const Icon = meta.icon;
  const adj = adjustmentDisplay(rule, currency);

  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors">
      {/* Priority indicator */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0 mt-0.5">
        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
          <span className="text-xs font-bold text-muted-foreground">{rule.priority}</span>
        </div>
      </div>

      {/* Type icon */}
      <div className={["w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", meta.color].join(" ")}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground truncate">{rule.name}</span>
          <span className={["text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full", meta.color].join(" ")}>
            {meta.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{scheduleLabel(rule)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Applies to: {rule.appliesTo === "all" ? "All services" : `${Array.isArray(rule.appliesTo) ? rule.appliesTo.length : 0} service(s)`}
        </p>
      </div>

      {/* Adjustment badge */}
      <div
        className={[
          "text-sm font-bold px-2.5 py-1 rounded-lg flex-shrink-0 whitespace-nowrap",
          adj.positive ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400",
        ].join(" ")}
      >
        {adj.text}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Toggle
          checked={rule.active}
          onChange={(v) => onToggle(rule.id, v)}
          disabled={toggling}
        />
        <button
          type="button"
          onClick={() => onEdit(rule)}
          className="w-7 h-7 rounded-lg hover:bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(rule.id)}
          disabled={deleting}
          className="w-7 h-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-40"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
