"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveDigestSettings } from "@/app/actions/settings";
import type { DigestSettings } from "@/app/actions/settings";
import type { DigestData } from "@/lib/generate-digest";
import { toast } from "@/components/ui/sonner";
import {
  Mail,
  RefreshCw,
  TrendingUp,
  CalendarDays,
  Users,
  Star,
  UserMinus,
  Award,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Send,
} from "lucide-react";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TIME_OPTIONS = [
  "06:00", "07:00", "08:00", "09:00", "10:00",
  "11:00", "12:00", "13:00", "14:00", "15:00",
  "16:00", "17:00", "18:00", "19:00", "20:00",
];

interface DigestSettingsFormProps {
  initial: DigestSettings;
  previewData: DigestData | null;
}

export function DigestSettingsForm({ initial, previewData }: DigestSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [settings, setSettings] = useState<DigestSettings>(initial);
  const [recipientInput, setRecipientInput] = useState(initial.recipients.join(", "));
  const [preview, setPreview] = useState<DigestData | null>(previewData);
  const [loadingPreview, setLoadingPreview] = useState(false);

  function update<K extends keyof DigestSettings>(key: K, value: DigestSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    const recipients = recipientInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    startTransition(async () => {
      const result = await saveDigestSettings({ ...settings, recipients });
      if (result.success) {
        toast.success("Digest settings saved");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    });
  }

  async function handlePreview() {
    setLoadingPreview(true);
    try {
      const res = await fetch("/api/cron/digest");
      const json = await res.json();
      if (json.data) {
        setPreview(json.data);
        toast.success("Preview refreshed");
      } else if (json.skipped) {
        toast.info("Digest is disabled — enable it first to preview");
      }
    } catch {
      toast.error("Failed to load preview");
    } finally {
      setLoadingPreview(false);
    }
  }

  function handleTestEmail() {
    const recipients = recipientInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const to = recipients.length > 0 ? recipients.join(", ") : "(no recipients configured)";
    toast.info(`Email would be sent to ${to} — integrate an email provider to enable this`);
  }

  return (
    <div className="space-y-8">
      {/* ── Settings Card ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
        <h2 className="text-lg font-semibold text-foreground">Digest Configuration</h2>

        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">Enable digest emails</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Send periodic business summary emails to your team
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.enabled}
            onClick={() => update("enabled", !settings.enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              settings.enabled ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Frequency */}
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Frequency</p>
          <div className="flex gap-3">
            {(["daily", "weekly"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => update("frequency", f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  settings.frequency === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Weekday (weekly only) */}
        {settings.frequency === "weekly" && (
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Send on</p>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day, idx) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => update("weekday", idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    settings.weekday === idx
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Time */}
        <div>
          <label htmlFor="digest-time" className="text-sm font-medium text-foreground block mb-2">
            Send time
          </label>
          <select
            id="digest-time"
            value={settings.time}
            onChange={(e) => update("time", e.target.value)}
            className="w-48 rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Recipients */}
        <div>
          <label htmlFor="digest-recipients" className="text-sm font-medium text-foreground block mb-1">
            Recipients
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Comma-separated email addresses
          </p>
          <input
            id="digest-recipients"
            type="text"
            value={recipientInput}
            onChange={(e) => setRecipientInput(e.target.value)}
            placeholder="owner@salon.com, manager@salon.com"
            className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
          />
        </div>

        {/* Include checkboxes */}
        <div>
          <p className="text-sm font-medium text-foreground mb-3">Include in digest</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              ["includeRevenue", "Revenue summary", TrendingUp],
              ["includeAppointments", "Appointments", CalendarDays],
              ["includeNewClients", "New clients", Users],
              ["includeReviews", "Reviews", Star],
              ["includeNoShows", "No-shows", UserMinus],
              ["includeTopStaff", "Top staff", Award],
            ] as [keyof DigestSettings, string, React.ElementType][]).map(([key, label, Icon]) => (
              <label
                key={key}
                className="flex items-center gap-2.5 cursor-pointer select-none group"
              >
                <div
                  onClick={() => update(key, !settings[key])}
                  className={`w-4 h-4 rounded flex items-center justify-center border transition-colors flex-shrink-0 ${
                    settings[key]
                      ? "bg-primary border-primary"
                      : "border-border group-hover:border-primary/50"
                  }`}
                >
                  {settings[key] && (
                    <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 10 8">
                      <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-foreground flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Save settings
          </button>
          <button
            type="button"
            onClick={handlePreview}
            disabled={loadingPreview}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted/50 disabled:opacity-50 transition-colors"
          >
            {loadingPreview ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Preview digest
          </button>
          <button
            type="button"
            onClick={handleTestEmail}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <Send className="w-4 h-4" />
            Send test email
          </button>
        </div>
      </div>

      {/* ── Cron instructions ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          Cron Setup
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Point a cron job to{" "}
          <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground text-[11px]">
            GET /api/cron/digest
          </code>{" "}
          at your desired schedule. The endpoint reads the frequency from your saved settings and
          generates the report automatically.
        </p>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">Example cron expressions:</p>
          <div className="space-y-1">
            <code className="block font-mono text-[11px] bg-muted px-3 py-1.5 rounded text-muted-foreground">
              0 8 * * *&nbsp;&nbsp;&nbsp;&nbsp;# Daily at 08:00
            </code>
            <code className="block font-mono text-[11px] bg-muted px-3 py-1.5 rounded text-muted-foreground">
              0 8 * * 1&nbsp;&nbsp;&nbsp;&nbsp;# Weekly on Monday at 08:00
            </code>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Secure with{" "}
          <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground text-[11px]">
            CRON_SECRET
          </code>{" "}
          env variable and pass{" "}
          <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground text-[11px]">
            Authorization: Bearer &lt;secret&gt;
          </code>{" "}
          in the cron request header.
        </p>
      </div>

      {/* ── Digest Preview ────────────────────────────────────────────────── */}
      {preview && <DigestPreviewCard data={preview} settings={settings} />}
    </div>
  );
}

// ── Digest Preview Card ────────────────────────────────────────────────────

function DigestPreviewCard({ data, settings }: { data: DigestData; settings: DigestSettings }) {
  const start = new Date(data.period.start).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
  const end = new Date(data.period.end).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="bg-primary/10 border-b border-border px-6 py-4">
        <div className="flex items-center gap-2 mb-1">
          <Mail className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Business Digest Preview</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          {start} — {end}
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Revenue */}
        {settings.includeRevenue && (
          <section>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              Revenue
            </h3>
            <div className="flex items-end gap-4 flex-wrap">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  ${data.revenue.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Total for period</p>
              </div>
              {data.revenue.vsLastPeriod !== null && (
                <div
                  className={`flex items-center gap-1 text-sm font-medium ${
                    data.revenue.vsLastPeriod > 0
                      ? "text-emerald-500"
                      : data.revenue.vsLastPeriod < 0
                      ? "text-red-500"
                      : "text-muted-foreground"
                  }`}
                >
                  {data.revenue.vsLastPeriod > 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : data.revenue.vsLastPeriod < 0 ? (
                    <ArrowDownRight className="w-4 h-4" />
                  ) : (
                    <Minus className="w-4 h-4" />
                  )}
                  {Math.abs(data.revenue.vsLastPeriod)}% vs last period
                </div>
              )}
            </div>
            {data.revenue.byDay.length > 0 && (
              <div className="mt-3 space-y-1">
                {data.revenue.byDay.map((d) => (
                  <div key={d.date} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-20 flex-shrink-0">{d.date}</span>
                    <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${Math.min(100, (d.amount / (data.revenue.total || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-foreground font-medium w-16 text-right">
                      ${d.amount.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Appointments funnel */}
        {settings.includeAppointments && (
          <section>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4 text-primary" />
              Appointments
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total", value: data.appointments.total, color: "text-foreground" },
                { label: "Completed", value: data.appointments.completed, color: "text-emerald-500" },
                { label: "Cancelled", value: data.appointments.cancelled, color: "text-amber-500" },
                { label: "No-shows", value: data.appointments.noShow, color: "text-red-500", hide: !settings.includeNoShows },
              ].filter((s) => !s.hide).map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Top staff */}
        {settings.includeTopStaff && data.topStaff.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-primary" />
              Top Staff
            </h3>
            <div className="space-y-2">
              {data.topStaff.map((s, i) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-4 flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.appointments} appts</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    ${s.revenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* New clients */}
        {settings.includeNewClients && data.newClients.count > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-primary" />
              New Clients
            </h3>
            <p className="text-2xl font-bold text-foreground">
              {data.newClients.count}
              <span className="text-sm font-normal text-muted-foreground ml-2">new this period</span>
            </p>
            {data.newClients.names.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {data.newClients.names.slice(0, 10).map((name) => (
                  <span
                    key={name}
                    className="text-xs bg-muted rounded-full px-2.5 py-0.5 text-muted-foreground"
                  >
                    {name}
                  </span>
                ))}
                {data.newClients.names.length > 10 && (
                  <span className="text-xs text-muted-foreground">
                    +{data.newClients.names.length - 10} more
                  </span>
                )}
              </div>
            )}
          </section>
        )}

        {/* Reviews */}
        {settings.includeReviews && data.recentReviews.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-primary" />
              Recent Reviews
              {data.avgRating !== null && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  avg {data.avgRating.toFixed(1)} / 5
                </span>
              )}
            </h3>
            <div className="space-y-3">
              {data.recentReviews.map((r, i) => (
                <div key={i} className="rounded-xl border border-border bg-muted/20 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    {Array.from({ length: 5 }).map((_, star) => (
                      <Star
                        key={star}
                        className={`w-3 h-3 ${
                          star < r.rating
                            ? "text-amber-400 fill-amber-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    ))}
                    {r.clientName && (
                      <span className="text-xs text-muted-foreground ml-1">— {r.clientName}</span>
                    )}
                  </div>
                  {r.comment && (
                    <p className="text-sm text-foreground leading-relaxed line-clamp-2">
                      {r.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!settings.includeRevenue &&
          !settings.includeAppointments &&
          !settings.includeTopStaff &&
          !settings.includeNewClients &&
          !settings.includeReviews && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <XCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No sections selected — enable at least one section above.
            </div>
          )}
      </div>
    </div>
  );
}

