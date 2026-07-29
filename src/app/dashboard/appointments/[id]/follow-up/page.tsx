import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  CalendarDays,
  Star,
  Heart,
  User,
  Scissors,
  Phone,
  Mail,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { RebookForm } from "./rebook-form";
import { ThankYouButton } from "./thank-you-button";
import { CopyLinkButton } from "./copy-link-button";
import { SendSmsReviewButton } from "./send-sms-review-button";
import { AddLoyaltyPointsButton } from "./add-loyalty-points-button";
import { RebookSuggestion } from "./rebook-suggestion";
import { QuickNotes } from "./quick-notes";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Compute suggested return date (ISO YYYY-MM-DD) based on service names. */
function computeSuggestedDate(appointmentDate: string, serviceNames: string[]): string {
  const lower = serviceNames.map((s) => s.toLowerCase());
  let daysToAdd: number;

  if (lower.some((s) => s.includes("color"))) {
    daysToAdd = 28; // 4 weeks
  } else if (lower.some((s) => s.includes("blowout") || s.includes("blowdry") || s.includes("blow dry"))) {
    daysToAdd = 10; // 1.5 weeks
  } else {
    daysToAdd = 42; // 6 weeks
  }

  const [y, m, d] = appointmentDate.split("-").map(Number);
  const base = new Date(y, m - 1, d);
  base.setDate(base.getDate() + daysToAdd);

  const yy = base.getFullYear();
  const mm = String(base.getMonth() + 1).padStart(2, "0");
  const dd = String(base.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Compute avg days between visits from a sorted list of ISO date strings. */
function computeAvgFrequencyDays(dates: string[]): number | null {
  if (dates.length < 2) return null;
  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    const [y1, m1, d1] = dates[i - 1].split("-").map(Number);
    const [y2, m2, d2] = dates[i].split("-").map(Number);
    const ms = new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime();
    gaps.push(ms / (1000 * 60 * 60 * 24));
  }
  return Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
}

/** Count consecutive months (most recent streak) that each have at least one visit. */
function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  // Build a set of "YYYY-MM" strings
  const monthSet = new Set(dates.map((d) => d.slice(0, 7)));

  // Walk backwards from the most recent month and count consecutive months
  const latestDate = dates[dates.length - 1];
  const [ly, lm] = latestDate.split("-").map(Number);

  let streak = 0;
  let year = ly;
  let month = lm;

  while (true) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    if (!monthSet.has(key)) break;
    streak++;
    month--;
    if (month === 0) {
      month = 12;
      year--;
    }
    // Safety: cap at 120 months
    if (streak > 120) break;
  }

  return streak;
}

/** Determine churn risk given last-visit days ago and avg frequency. */
function computeChurnRisk(
  daysSinceLastVisit: number | null,
  avgFrequency: number | null
): { label: "Active" | "At-Risk" | "High Risk"; colorClass: string; bgClass: string; icon: "check" | "warning" | "alert" } {
  if (daysSinceLastVisit === null) {
    return { label: "Active", colorClass: "text-emerald-500", bgClass: "bg-emerald-500/15", icon: "check" };
  }

  if (daysSinceLastVisit > 90) {
    return { label: "High Risk", colorClass: "text-[#F41666]", bgClass: "bg-[#F41666]/15", icon: "alert" };
  }

  if (daysSinceLastVisit > 45) {
    return { label: "At-Risk", colorClass: "text-amber-500", bgClass: "bg-amber-500/15", icon: "warning" };
  }

  if (avgFrequency !== null && daysSinceLastVisit > avgFrequency * 1.5) {
    return { label: "At-Risk", colorClass: "text-amber-500", bgClass: "bg-amber-500/15", icon: "warning" };
  }

  return { label: "Active", colorClass: "text-emerald-500", bgClass: "bg-emerald-500/15", icon: "check" };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function FollowUpPage({ params }: PageProps) {
  const { id } = await params;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      Client: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          loyaltyPoints: true,
          createdAt: true,
          _count: { select: { Appointment: true } },
        },
      },
      Staff: { select: { id: true, name: true } },
      AppointmentService: {
        include: {
          Service: { select: { id: true, name: true, price: true } },
        },
      },
      Salon: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!appointment) notFound();

  if (appointment.status !== "COMPLETED") {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href="/dashboard/appointments"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to appointments
          </Link>
        </div>
        <Card className="bg-card border-border">
          <CardContent className="pt-6 text-center py-12">
            <p className="text-muted-foreground text-sm">
              Follow-up actions are only available for{" "}
              <span className="font-medium text-foreground">completed</span> appointments.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Current status:{" "}
              <span className="font-medium">{appointment.status}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const serviceNames = appointment.AppointmentService.map((as) => as.Service.name);
  const reviewLink = `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/portal/${appointment.Salon.slug}/review/${id}`;

  const client = appointment.Client;

  // Total visits = count of all appointments for this client
  const totalVisits = client?._count.Appointment ?? 0;

  // Last visit = most recent completed appointment before this one
  let lastVisitLabel: string | null = null;
  let lastVisitDaysAgo: number | null = null;

  if (client) {
    const lastVisit = await prisma.appointment.findFirst({
      where: {
        clientId: client.id,
        status: "COMPLETED",
        id: { not: id },
      },
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
      select: { date: true },
    });
    if (lastVisit) {
      const [y, m, d] = lastVisit.date.split("-").map(Number);
      const lastDate = new Date(y, m - 1, d);
      lastVisitLabel = lastDate.toLocaleDateString("en", { dateStyle: "medium" });

      const [ty, tm, td] = appointment.date.split("-").map(Number);
      const thisDate = new Date(ty, tm - 1, td);
      lastVisitDaysAgo = Math.round(
        (thisDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    }
  }

  // Get all completed appointments for this client to compute retention metrics
  const clientHistory = client
    ? await prisma.appointment.findMany({
        where: { clientId: client.id, status: "COMPLETED" },
        orderBy: { date: "asc" },
        select: { date: true },
      })
    : [];

  const historyDates = clientHistory.map((a) => a.date);
  const avgFrequency = computeAvgFrequencyDays(historyDates);
  const streak = computeStreak(historyDates);
  const churnRisk = computeChurnRisk(lastVisitDaysAgo, avgFrequency);

  // Suggested return date
  const suggestedDate = computeSuggestedDate(appointment.date, serviceNames);

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      {/* Back nav */}
      <div className="mb-6">
        <Link
          href="/dashboard/appointments"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to appointments
        </Link>
      </div>

      {/* Page heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Follow-Up</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Post-visit actions for this appointment
        </p>
      </div>

      {/* ── Client info card ─────────────────────────────────────────────── */}
      {client && (
        <Card className="bg-card border-border mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="w-4 h-4 text-primary" />
                Client Profile
              </CardTitle>
              {client && (
                <Link
                  href={`/dashboard/clients/${client.id}`}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                >
                  View profile
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="font-semibold text-base">{client.name}</span>
            </div>
            {client.phone && (
              <div className="flex items-center gap-2 text-foreground">
                <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2 text-foreground">
                <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span>{client.email}</span>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-secondary/50 p-2.5">
                <p className="text-xl font-bold text-foreground">{totalVisits}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Total visits</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-2.5">
                <p className="text-xl font-bold text-foreground">
                  {client.loyaltyPoints.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Loyalty pts</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-2.5">
                <p className="text-sm font-semibold text-foreground leading-tight">
                  {lastVisitLabel ?? "First visit"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Last visit</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appointment summary (for walk-ins or when no client profile) */}
      {!client && (
        <Card className="bg-card border-border mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Appointment Summary</CardTitle>
              <Badge className="bg-primary/20 text-primary border-0">Completed</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium">Walk-in</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <Scissors className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span>{appointment.Staff.name}</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <CalendarDays className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span>
                {new Date(appointment.date + "T00:00:00").toLocaleDateString("en", {
                  dateStyle: "long",
                })}{" "}
                at {appointment.startTime}
              </span>
            </div>
            {serviceNames.length > 0 && (
              <div className="flex items-start gap-2 text-foreground">
                <Scissors className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span>{serviceNames.join(", ")}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action cards */}
      <div className="space-y-4">
        {/* 1 — Rebook */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="w-5 h-5 text-primary" />
              Rebook Appointment
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Schedule a follow-up with the same staff and services.
            </p>
          </CardHeader>
          <CardContent>
            <RebookForm
              appointmentId={id}
              services={serviceNames}
              staffName={appointment.Staff.name}
            />
          </CardContent>
        </Card>

        {/* 2 — Review request */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="w-5 h-5 text-yellow-500" />
              Request a Review
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Share this link so the client can leave a review.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2">
              <span className="flex-1 text-xs font-mono text-foreground truncate">
                {reviewLink}
              </span>
              <CopyLinkButton link={reviewLink} />
            </div>
            {client?.phone && (
              <SendSmsReviewButton
                appointmentId={id}
                clientId={client.id}
                reviewLink={reviewLink}
                salonName={appointment.Salon.name}
              />
            )}
          </CardContent>
        </Card>

        {/* 3 — Thank you message */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="w-5 h-5 text-pink-500" />
              Send Thank You
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Send a personalised thank-you SMS to the client.
            </p>
          </CardHeader>
          <CardContent>
            <ThankYouButton
              appointmentId={id}
              clientId={appointment.clientId}
              salonName={appointment.Salon.name}
              serviceNames={serviceNames}
            />
          </CardContent>
        </Card>

        {/* 4 — Loyalty points (only for clients with a profile) */}
        {client && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500/30" />
                Loyalty Points
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Award bonus points for this visit.
              </p>
            </CardHeader>
            <CardContent>
              <AddLoyaltyPointsButton
                clientId={client.id}
                appointmentId={id}
                currentBalance={client.loyaltyPoints}
              />
            </CardContent>
          </Card>
        )}

        {/* 5 — Rebook suggestion (smart recommended date) */}
        <RebookSuggestion
          appointmentId={id}
          services={serviceNames}
          appointmentDate={appointment.date}
          staffName={appointment.Staff.name}
          suggestedDate={suggestedDate}
        />

        {/* 6 — Retention metrics (client only) */}
        {client && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-5 h-5 text-primary" />
                Retention Metrics
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Client visit patterns and churn risk.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Churn risk badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${churnRisk.bgClass} ${churnRisk.colorClass}`}
                >
                  {churnRisk.icon === "check" && (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  {churnRisk.icon === "warning" && (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  {churnRisk.icon === "alert" && (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  {churnRisk.label}
                </span>
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-3 text-sm">
                {/* Visit frequency */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>Avg visit frequency</span>
                  </div>
                  <span className="font-medium text-foreground">
                    {avgFrequency !== null
                      ? `Every ${avgFrequency} days`
                      : "Not enough data"}
                  </span>
                </div>

                {/* Days since last visit */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="w-4 h-4 flex-shrink-0" />
                    <span>Since last visit</span>
                  </div>
                  <span className="font-medium text-foreground">
                    {lastVisitDaysAgo !== null
                      ? `${lastVisitDaysAgo} day${lastVisitDaysAgo === 1 ? "" : "s"}`
                      : "First visit"}
                  </span>
                </div>

                {/* Streak */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="w-4 h-4 flex-shrink-0" />
                    <span>Visit streak</span>
                  </div>
                  <span className="font-medium text-foreground">
                    {streak > 0
                      ? `${streak} month${streak === 1 ? "" : "s"} in a row`
                      : "—"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 7 — Quick notes */}
        <QuickNotes appointmentId={id} notesJson={appointment.notes} />
      </div>
    </div>
  );
}
