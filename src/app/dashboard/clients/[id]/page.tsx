import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LoyaltyBadge } from "@/components/clients/loyalty-badge";
import { getLoyaltyTier } from "@/lib/loyalty-utils";
import { MembershipSection } from "@/components/clients/membership-section";
import { PointsPanel } from "@/components/clients/points-panel";
import { ClientPackagesSection } from "@/components/clients/client-packages-section";
import {
  ArrowLeft,
  Phone,
  Mail,
  Cake,
  Heart,
  StickyNote,
  TrendingUp,
  Wallet,
  CalendarDays,
  Star,
  Clock,
  User2,
  Receipt,
  Zap,
  Crown,
  PhoneOff,
  Tag,
  Settings2,
  CreditCard,
  Package2,
  Image,
  BarChart2,
} from "lucide-react";
import {
  QuickActions,
  ClientFlagsToggle,
  CommunicationTab,
} from "./client-detail-actions";
import {
  FormulaNoteBox,
  RebookButton,
  AddAppointmentNoteButton,
  StarRating,
  PhotoGallery,
} from "./appointment-history-actions";
import type { AppointmentNotes } from "@/app/actions/appointments";
import { parseClientNotes } from "@/app/actions/clients-constants";
import { getClientPackages, getPackages } from "@/app/actions/packages";
import { getAllClientTags } from "@/app/actions/clients";
import { AllergyAlertBadge } from "@/components/clients/allergy-alert-badge";
import { ClientNotesTimeline } from "@/components/clients/client-notes-timeline";
import { ClientTagsInput } from "@/components/clients/client-tags-input";
import { ClientPreferencesPanel } from "@/components/clients/client-preferences-panel";
import type { ExtendedClientPreferences } from "@/components/clients/client-preferences-panel";
import { AllergyAlertBanner } from "@/components/clients/allergy-alert-banner";
import { ClientCustomFields } from "@/components/clients/client-custom-fields";

export const dynamic = "force-dynamic";

const statusColor: Record<string, string> = {
  SCHEDULED: "bg-[#F48E16]/20 text-[#F48E16] border-0",
  COMPLETED: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0",
  CANCELLED: "bg-[#F41666]/20 text-[#F41666] border-0",
  NO_SHOW: "bg-muted text-muted-foreground border-0",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [client, salon, availablePlans, clientPackages, allPackages, communications, allStaff, allTagsList] = await Promise.all([
    prisma.client.findUnique({
      where: { id },
      include: {
        Appointment: {
          orderBy: { date: "desc" },
          include: {
            Staff: true,
            AppointmentService: { include: { Service: true } },
            Invoice: true,
            Reminder: true,
            Review: true,
          },
        },
        LedgerEntry: {
          orderBy: { createdAt: "desc" },
        },
        Invoice: {
          orderBy: { createdAt: "desc" },
        },
        ClientMembership: {
          include: { Plan: true },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.salon.findFirst(),
    prisma.membershipPlan.findMany({
      where: { active: true },
      orderBy: { price: "asc" },
    }),
    getClientPackages(id),
    getPackages(),
    prisma.reminder.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        message: true,
        scheduledAt: true,
        sentAt: true,
        createdAt: true,
      },
    }),
    prisma.staff.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    getAllClientTags(),
  ]);

  if (!client) notFound();

  const currency = salon?.currency ?? "USD";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  // --- Stats ---
  const totalVisits = client.Appointment.length;
  const totalSpend = client.Appointment.reduce(
    (sum, a) => sum + a.totalAmount,
    0
  );

  // --- Net ledger balance ---
  const ledgerBalance = client.LedgerEntry.reduce((sum, entry) => {
    return entry.type === "CREDIT" ? sum + entry.amount : sum - entry.amount;
  }, 0);

  // --- Top services ---
  const serviceCount: Record<string, { name: string; count: number }> = {};
  for (const appt of client.Appointment) {
    for (const as of appt.AppointmentService) {
      const sid = as.Service.id;
      if (!serviceCount[sid]) {
        serviceCount[sid] = { name: as.Service.name, count: 0 };
      }
      serviceCount[sid].count++;
    }
  }
  const topServices = Object.values(serviceCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // --- Next visit prediction ---
  let nextVisitPrediction: string | null = null;
  const completedAppts = client.Appointment.filter(
    (a) => a.status === "COMPLETED"
  ).sort((a, b) => (a.date > b.date ? 1 : -1));

  if (completedAppts.length >= 3) {
    const dates = completedAppts.map((a) => new Date(a.date).getTime());
    let totalGap = 0;
    for (let i = 1; i < dates.length; i++) {
      totalGap += dates[i] - dates[i - 1];
    }
    const avgGapMs = totalGap / (dates.length - 1);
    const lastDate = dates[dates.length - 1];
    const predictedDate = new Date(lastDate + avgGapMs);
    nextVisitPrediction = predictedDate.toLocaleDateString("en", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  // --- Upcoming appointment for reminder ---
  const today = new Date().toISOString().slice(0, 10);
  const upcomingAppointment = client.Appointment.find(
    (a) => a.status === "SCHEDULED" && a.date >= today
  ) ?? null;

  // --- Service history summary stats ---
  const completedOnly = client.Appointment.filter((a) => a.status === "COMPLETED");
  const avgTicket = completedOnly.length > 0 ? completedOnly.reduce((s, a) => s + a.totalAmount, 0) / completedOnly.length : 0;

  // Favorite service (most booked)
  const favoriteService = topServices[0]?.name ?? null;

  // Favorite staff
  const staffCount: Record<string, { name: string; count: number }> = {};
  for (const appt of client.Appointment) {
    const sid = appt.staffId;
    if (!staffCount[sid]) staffCount[sid] = { name: appt.Staff.name, count: 0 };
    staffCount[sid].count++;
  }
  const favoriteStaff = Object.values(staffCount).sort((a, b) => b.count - a.count)[0]?.name ?? null;

  // Last visit days ago
  const lastVisitAppt = completedOnly[0] ?? null;
  const lastVisitDaysAgo = lastVisitAppt
    ? Math.floor((Date.now() - new Date(lastVisitAppt.date + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Avg visit frequency (only completed)
  let avgFrequencyDays: number | null = null;
  if (completedAppts.length >= 2) {
    const cDates = completedAppts.map((a) => new Date(a.date).getTime());
    let gap = 0;
    for (let i = 1; i < cDates.length; i++) gap += cDates[i] - cDates[i - 1];
    avgFrequencyDays = Math.round(gap / (cDates.length - 1) / (1000 * 60 * 60 * 24));
  }

  // Month streak: consecutive months (going backwards from today) with at least one completed visit
  let monthStreak = 0;
  if (completedOnly.length > 0) {
    const now = new Date();
    let checkYear = now.getFullYear();
    let checkMonth = now.getMonth();
    // Allow current month and go back
    for (let i = 0; i < 24; i++) {
      const hasVisit = completedOnly.some((a) => {
        const d = new Date(a.date + "T00:00:00");
        return d.getFullYear() === checkYear && d.getMonth() === checkMonth;
      });
      if (!hasVisit) break;
      monthStreak++;
      checkMonth--;
      if (checkMonth < 0) { checkMonth = 11; checkYear--; }
    }
  }

  type RetentionStatus = "active" | "at-risk" | "lost";
  let retentionStatus: RetentionStatus = "active";
  if (lastVisitDaysAgo !== null) {
    if (lastVisitDaysAgo > 90) retentionStatus = "lost";
    else if (lastVisitDaysAgo > 45) retentionStatus = "at-risk";
    else retentionStatus = "active";
  } else if (completedOnly.length === 0) {
    retentionStatus = "active"; // new client
  }

  // --- Allergy detection ---
  const parsedNotes = parseClientNotes(client.notes);
  const allergyNotes = parsedNotes.filter((n) => n.type === "allergy");
  let prefsObj: Record<string, unknown> = {};
  try { prefsObj = JSON.parse(client.preferences ?? "{}") as Record<string, unknown>; } catch { /* */ }

  // Support both legacy string and new array format
  const allergyPreference: string[] = [];
  if (Array.isArray(prefsObj.allergies)) {
    allergyPreference.push(...(prefsObj.allergies as string[]).filter((a): a is string => typeof a === "string" && a.trim() !== ""));
  } else if (typeof prefsObj.allergies === "string" && prefsObj.allergies.trim()) {
    allergyPreference.push(prefsObj.allergies.trim());
  }

  const allergyAlertText: string[] = [];
  if (allergyNotes.length > 0) allergyAlertText.push(...allergyNotes.map((n) => n.text));
  allergyAlertText.push(...allergyPreference);
  // Also check notes for allergy keywords as fallback
  const allergyKeywords = ["allerg", "react", "sensitive", "ppd", "ammonia", "latex", "penicillin", "sulfa"];
  if (allergyAlertText.length === 0) {
    for (const n of parsedNotes) {
      const lower = n.text.toLowerCase();
      if (allergyKeywords.some((kw) => lower.includes(kw))) {
        allergyAlertText.push(n.text);
        break;
      }
    }
  }
  const hasAllergyAlert = allergyAlertText.length > 0;

  // --- Parse photos from preferences ---
  const clientPhotos: string[] = Array.isArray(prefsObj.__photos) ? (prefsObj.__photos as string[]) : [];

  return (
    <div className="p-4 md:p-8">
      {/* ── Allergy Alert Banner ──────────────────────────────── */}
      {hasAllergyAlert && (
        <AllergyAlertBanner alertTexts={allergyAlertText} />
      )}

      {/* Back button */}
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Clients
      </Link>

      <div className="flex flex-col lg:flex-row gap-6 md:gap-8 items-start">
        {/* ── Left sidebar ─────────────────────────────── */}
        <aside className="w-full lg:w-72 lg:flex-shrink-0 space-y-4">
          {/* Profile card */}
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              {/* Avatar + name */}
              <div className="flex flex-col items-center text-center gap-3 mb-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-[#F48E16]/20 flex items-center justify-center text-[#F48E16] text-2xl font-bold">
                    {client.name[0].toUpperCase()}
                  </div>
                  {client.isVip && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center shadow-md">
                      <Crown className="w-3 h-3 text-white" />
                    </span>
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    {client.name}
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Client since{" "}
                    {new Date(client.createdAt).toLocaleDateString("en", {
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  {/* Flag badges */}
                  <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                    {client.isVip && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 border border-yellow-500/30 px-2 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                        <Crown className="w-3 h-3" />
                        VIP
                      </span>
                    )}
                    {client.doNotContact && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F41666]/15 border border-[#F41666]/30 px-2 py-0.5 text-xs font-medium text-[#F41666]">
                        <PhoneOff className="w-3 h-3" />
                        Do Not Contact
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-2 mb-6">
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    {client.phone}
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.birthday && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Cake className="w-4 h-4 flex-shrink-0" />
                    {new Date(client.birthday).toLocaleDateString("en", {
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                )}
                {client.anniversary && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Heart className="w-4 h-4 flex-shrink-0" />
                    Anniversary:{" "}
                    {new Date(client.anniversary).toLocaleDateString("en", {
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-foreground">
                    {totalVisits}
                  </p>
                  <p className="text-xs text-muted-foreground">Visits</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-foreground">
                    {fmt(totalSpend)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total spend</p>
                </div>
              </div>

              {/* Loyalty summary */}
              <div className="pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Loyalty
                </p>
                <LoyaltyBadge
                  points={client.loyaltyPoints}
                  variant="full"
                  className="w-full"
                />
              </div>

              {/* Membership summary */}
              <div className="pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  Membership
                </p>
                <MembershipSection
                  clientId={id}
                  activeMembership={
                    client.ClientMembership.find((m) => m.status === "ACTIVE") ?? null
                  }
                  availablePlans={availablePlans}
                />
              </div>
            </CardContent>
          </Card>

          {/* Retention Score */}
          <Card className="bg-card border-border">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#F48E16]" />
                  Retention Score
                </CardTitle>
                {/* Status badge */}
                {retentionStatus === "active" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    Active
                  </span>
                )}
                {retentionStatus === "at-risk" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                    At-Risk
                  </span>
                )}
                {retentionStatus === "lost" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F41666]/15 px-2 py-0.5 text-xs font-semibold text-[#F41666]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F41666] flex-shrink-0" />
                    Lost
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                {/* Last Visit */}
                <div className="rounded-lg bg-secondary/40 p-2.5">
                  <div className="flex items-center gap-1 mb-1">
                    <CalendarDays className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <p className="text-xs font-medium text-muted-foreground">Last Visit</p>
                  </div>
                  {lastVisitAppt ? (
                    <>
                      <p className="text-sm font-semibold text-foreground leading-tight">
                        {new Date(lastVisitAppt.date + "T00:00:00").toLocaleDateString("en", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ({lastVisitDaysAgo}d ago)
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </div>

                {/* Visit Frequency */}
                <div className="rounded-lg bg-secondary/40 p-2.5">
                  <div className="flex items-center gap-1 mb-1">
                    <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <p className="text-xs font-medium text-muted-foreground">Frequency</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {avgFrequencyDays !== null ? `every ${avgFrequencyDays}d` : "—"}
                  </p>
                </div>

                {/* Next Expected Visit */}
                <div className="rounded-lg bg-secondary/40 p-2.5">
                  <div className="flex items-center gap-1 mb-1">
                    <CalendarDays className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <p className="text-xs font-medium text-muted-foreground">Next Expected</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {nextVisitPrediction ?? "—"}
                  </p>
                </div>

                {/* Streak */}
                <div className="rounded-lg bg-secondary/40 p-2.5">
                  <div className="flex items-center gap-1 mb-1">
                    <TrendingUp className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <p className="text-xs font-medium text-muted-foreground">Streak</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {monthStreak > 1
                      ? `${monthStreak} months`
                      : completedOnly.length === 1
                      ? "1 visit"
                      : monthStreak === 1
                      ? "1 month"
                      : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next visit prediction */}
          {nextVisitPrediction && (
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <CalendarDays className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">
                      Next visit predicted
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Around {nextVisitPrediction}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top services */}
          {topServices.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#F48E16]" />
                  Top Services
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-2">
                  {topServices.map((svc, i) => (
                    <div
                      key={svc.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm text-foreground truncate">
                          {svc.name}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        ×{svc.count}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Quick Actions ──────────────────────────── */}
          <Card className="bg-card border-border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#F48E16]" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <QuickActions
                clientId={id}
                upcomingAppointmentId={upcomingAppointment?.id ?? null}
                currentPoints={client.loyaltyPoints}
              />
            </CardContent>
          </Card>
        </aside>

        {/* ── Right column — tabs ───────────────────────── */}
        <div className="flex-1 min-w-0">
          <Tabs defaultValue="visits">
            <TabsList className="mb-6 flex-wrap">
              <TabsTrigger value="visits">Appointments</TabsTrigger>
              <TabsTrigger value="ledger">Ledger</TabsTrigger>
              <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
              <TabsTrigger value="membership">
                <CreditCard className="w-3.5 h-3.5 mr-1" />
                Membership
              </TabsTrigger>
              <TabsTrigger value="packages">
                <Package2 className="w-3.5 h-3.5 mr-1" />
                Packages
              </TabsTrigger>
              <TabsTrigger value="photos">
                <Image className="w-3.5 h-3.5 mr-1" />
                Photos
              </TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="tags">
                <Tag className="w-3.5 h-3.5 mr-1" />
                Tags
              </TabsTrigger>
              <TabsTrigger value="preferences">
                <Settings2 className="w-3.5 h-3.5 mr-1" />
                Preferences
              </TabsTrigger>
              <TabsTrigger value="communications">Communications</TabsTrigger>
            </TabsList>

            {/* ── Appointments tab ───────────────────────── */}
            <TabsContent value="visits">
              {client.Appointment.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  No appointments yet
                </div>
              ) : (
                <>
                  {/* ── Service History Summary ──────────────── */}
                  <div className="mb-5 p-4 rounded-xl bg-card border border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <BarChart2 className="w-3.5 h-3.5" />
                      Service History Summary
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      <div className="rounded-lg bg-secondary/40 p-3">
                        <p className="text-lg font-bold text-foreground leading-none">{totalVisits}</p>
                        <p className="text-xs text-muted-foreground mt-1">Total visits</p>
                      </div>
                      <div className="rounded-lg bg-secondary/40 p-3">
                        <p className="text-lg font-bold text-foreground leading-none">{fmt(totalSpend)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Total spent</p>
                      </div>
                      <div className="rounded-lg bg-secondary/40 p-3">
                        <p className="text-lg font-bold text-foreground leading-none">{fmt(avgTicket)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Avg ticket</p>
                      </div>
                      {lastVisitDaysAgo !== null && (
                        <div className="rounded-lg bg-secondary/40 p-3">
                          <p className="text-lg font-bold text-foreground leading-none">{lastVisitDaysAgo}d</p>
                          <p className="text-xs text-muted-foreground mt-1">Since last visit</p>
                        </div>
                      )}
                      {favoriteService && (
                        <div className="rounded-lg bg-secondary/40 p-3 col-span-2 sm:col-span-1">
                          <p className="text-sm font-semibold text-foreground leading-tight truncate">{favoriteService}</p>
                          <p className="text-xs text-muted-foreground mt-1">Favorite service</p>
                        </div>
                      )}
                      {favoriteStaff && (
                        <div className="rounded-lg bg-secondary/40 p-3 col-span-2 sm:col-span-1">
                          <p className="text-sm font-semibold text-foreground leading-tight truncate">{favoriteStaff}</p>
                          <p className="text-xs text-muted-foreground mt-1">Favorite staff</p>
                        </div>
                      )}
                      {avgFrequencyDays !== null && (
                        <div className="rounded-lg bg-secondary/40 p-3">
                          <p className="text-lg font-bold text-foreground leading-none">{avgFrequencyDays}d</p>
                          <p className="text-xs text-muted-foreground mt-1">Avg frequency</p>
                        </div>
                      )}
                      {/* Retention status tile */}
                      <div
                        className={`rounded-lg p-3 ${
                          retentionStatus === "active"
                            ? "bg-emerald-500/10"
                            : retentionStatus === "at-risk"
                            ? "bg-amber-500/10"
                            : "bg-[#F41666]/10"
                        }`}
                      >
                        <p
                          className={`text-lg font-bold leading-none ${
                            retentionStatus === "active"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : retentionStatus === "at-risk"
                              ? "text-amber-600"
                              : "text-[#F41666]"
                          }`}
                        >
                          {retentionStatus === "active"
                            ? "Active"
                            : retentionStatus === "at-risk"
                            ? "At-Risk"
                            : "Lost"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Status</p>
                      </div>
                    </div>
                  </div>

                  {/* ── Rich Timeline ────────────────────────── */}
                  <div className="space-y-4">
                    {client.Appointment.map((appt) => {
                      // Parse notes JSON or fall back to plain text
                      let parsedApptNotes: AppointmentNotes = {};
                      if (appt.notes) {
                        try {
                          parsedApptNotes = JSON.parse(appt.notes) as AppointmentNotes;
                        } catch {
                          parsedApptNotes = { general: appt.notes };
                        }
                      }
                      const hasGeneralNote = !!parsedApptNotes.general;
                      const review = appt.Review ?? null;

                      return (
                        <div
                          key={appt.id}
                          className="rounded-xl bg-card border border-border hover:border-primary/20 transition-colors"
                        >
                          {/* ── Top row: date, status, amount ──── */}
                          <div className="flex items-start gap-4 p-4">
                            {/* Date column */}
                            <div className="min-w-[72px] text-center flex-shrink-0">
                              <p className="text-sm font-bold text-foreground">
                                {new Date(appt.date).toLocaleDateString("en", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(appt.date).getFullYear()}
                              </p>
                              <div className="flex items-center justify-center gap-0.5 mt-1">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">{appt.startTime}</p>
                              </div>
                            </div>

                            <div className="w-px self-stretch bg-border flex-shrink-0" />

                            {/* Middle: services + staff + review */}
                            <div className="flex-1 min-w-0 space-y-1.5">
                              {/* Services with prices */}
                              <div className="flex flex-wrap gap-1.5">
                                {appt.AppointmentService.length > 0 ? (
                                  appt.AppointmentService.map((as) => (
                                    <span
                                      key={as.serviceId}
                                      className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-foreground"
                                    >
                                      {as.Service.name}
                                      <span className="ml-1 text-muted-foreground">
                                        {fmt(as.Service.price)}
                                      </span>
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground">No services</span>
                                )}
                              </div>

                              {/* Staff */}
                              <div className="flex items-center gap-1.5">
                                <User2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs text-muted-foreground">{appt.Staff.name}</span>
                              </div>

                              {/* General note excerpt */}
                              {hasGeneralNote && (
                                <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
                                  {parsedApptNotes.general}
                                </p>
                              )}

                              {/* Formula note summary (collapsed) */}
                              {(parsedApptNotes.formula || parsedApptNotes.result) && (
                                <div className="flex flex-wrap gap-2 text-xs">
                                  {parsedApptNotes.formula && (
                                    <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5">
                                      Formula: {parsedApptNotes.formula}
                                    </span>
                                  )}
                                  {parsedApptNotes.result && (
                                    <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded px-1.5 py-0.5">
                                      Result: {parsedApptNotes.result}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Review */}
                              {review && (
                                <div className="flex items-center gap-2 mt-1">
                                  <StarRating rating={review.rating} />
                                  {review.comment && (
                                    <span className="text-xs text-muted-foreground italic truncate">
                                      &ldquo;{review.comment}&rdquo;
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Right: amount + status */}
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              <p className="text-sm font-bold text-foreground">{fmt(appt.totalAmount)}</p>
                              <Badge
                                className={statusColor[appt.status] ?? "bg-muted text-muted-foreground border-0"}
                              >
                                {appt.status.replace("_", " ")}
                              </Badge>
                            </div>
                          </div>

                          {/* ── Action buttons row ──────────────── */}
                          <div className="flex items-center gap-2 px-4 pb-3 flex-wrap border-t border-border/50 pt-2.5">
                            <RebookButton clientId={id} appointmentId={appt.id} />
                            {appt.Invoice && (
                              <Link
                                href={`/dashboard/invoices/${appt.Invoice.id}`}
                                className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/40 px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
                              >
                                <Receipt className="size-3 text-muted-foreground" />
                                View Invoice
                              </Link>
                            )}
                            <AddAppointmentNoteButton
                              appointmentId={appt.id}
                              currentNotes={parsedApptNotes}
                            />
                          </div>

                          {/* ── Formula Notes Box (completed appts) ── */}
                          {(appt.status === "COMPLETED" || appt.status === "IN_PROGRESS") && (
                            <div className="px-4 pb-4">
                              <FormulaNoteBox
                                appointmentId={appt.id}
                                initialNotes={parsedApptNotes}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Total spend footer */}
                  <div className="mt-4 flex items-center justify-between px-4 py-3 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Receipt className="w-4 h-4" />
                      Total spend across all visits
                    </div>
                    <p className="text-base font-bold text-foreground">{fmt(totalSpend)}</p>
                  </div>
                </>
              )}
            </TabsContent>

            {/* ── Ledger tab ─────────────────────────────── */}
            <TabsContent value="ledger">
              {/* Balance */}
              <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-card border border-border">
                <Wallet className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                    Net Balance
                  </p>
                  <p
                    className={`text-xl font-bold ${
                      ledgerBalance >= 0 ? "text-primary" : "text-[#F41666]"
                    }`}
                  >
                    {ledgerBalance >= 0 ? "+" : ""}
                    {fmt(ledgerBalance)}
                  </p>
                </div>
              </div>

              {client.LedgerEntry.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Wallet className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  No ledger entries
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-x-auto">
                  <table className="w-full text-sm min-w-[400px]">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                          Type
                        </th>
                        <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                          Note
                        </th>
                        <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                          Date
                        </th>
                        <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {client.LedgerEntry.map((entry) => (
                        <tr
                          key={entry.id}
                          className="bg-card hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <Badge
                              className={
                                entry.type === "CREDIT"
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0"
                                  : "bg-[#F41666]/15 text-[#F41666] border-0"
                              }
                            >
                              {entry.type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                            {entry.note ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {new Date(entry.createdAt).toLocaleDateString(
                              "en",
                              { dateStyle: "medium" }
                            )}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-bold whitespace-nowrap ${
                              entry.type === "CREDIT"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-[#F41666]"
                            }`}
                          >
                            {entry.type === "CREDIT" ? "+" : "-"}
                            {fmt(entry.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* ── Loyalty tab ────────────────────────────── */}
            <TabsContent value="loyalty">
              {(() => {
                const tier = getLoyaltyTier(client.loyaltyPoints);
                const tierThresholds: Record<
                  string,
                  { next: string | null; target: number | null }
                > = {
                  Bronze: { next: "Silver", target: 100 },
                  Silver: { next: "Gold", target: 500 },
                  Gold: { next: "Platinum", target: 1000 },
                  Platinum: { next: null, target: null },
                };
                const { next, target } = tierThresholds[tier];
                const progress =
                  target !== null
                    ? Math.min(
                        100,
                        Math.round((client.loyaltyPoints / target) * 100)
                      )
                    : 100;

                const tierBenefits: Record<string, string[]> = {
                  Bronze: [
                    "Earn 1 point per $10 spent",
                    "Birthday discount: 5% off",
                  ],
                  Silver: [
                    "Earn 1 point per $10 spent",
                    "Birthday discount: 10% off",
                    "Priority booking",
                  ],
                  Gold: [
                    "Earn 1 point per $10 spent",
                    "Birthday discount: 15% off",
                    "Priority booking",
                    "Free add-on service (monthly)",
                  ],
                  Platinum: [
                    "Earn 1 point per $10 spent",
                    "Birthday discount: 20% off",
                    "Priority booking",
                    "Free add-on service (monthly)",
                    "VIP lounge access",
                    "Dedicated stylist",
                  ],
                };

                return (
                  <div className="space-y-6">
                    {/* Points management panel */}
                    <PointsPanel clientId={id} currentPoints={client.loyaltyPoints} />

                    {/* Points balance hero */}
                    <div className="p-5 rounded-xl bg-card border border-border flex items-center gap-5">
                      <LoyaltyBadge
                        points={client.loyaltyPoints}
                        variant="full"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-2xl font-bold text-foreground leading-none">
                          {client.loyaltyPoints}
                          <span className="text-base font-medium text-muted-foreground ml-1.5">
                            pts
                          </span>
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {tier} tier member
                        </p>
                        {next && target !== null && (
                          <div className="mt-3 space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>
                                {target - client.loyaltyPoints} pts to {next}
                              </span>
                              <span>{progress}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {tier === "Platinum" && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Maximum tier — enjoy all benefits!
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Tier benefits */}
                    <Card className="bg-card border-border">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Star className="w-4 h-4 text-[#F48E16]" />
                          {tier} Tier Benefits
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <ul className="space-y-1.5">
                          {tierBenefits[tier].map((benefit) => (
                            <li
                              key={benefit}
                              className="flex items-start gap-2 text-sm text-muted-foreground"
                            >
                              <span className="text-primary mt-0.5">•</span>
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    {/* Full ledger history */}
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-3">
                        Points History
                      </p>
                      {client.LedgerEntry.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                          <Star className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <p className="text-sm">No points activity yet</p>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-border overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/40">
                              <tr>
                                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                                  Type
                                </th>
                                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                                  Note
                                </th>
                                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                                  Date
                                </th>
                                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                                  Points
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {client.LedgerEntry.map((entry) => (
                                <tr
                                  key={entry.id}
                                  className="bg-card hover:bg-muted/20 transition-colors"
                                >
                                  <td className="px-4 py-3">
                                    <Badge
                                      className={
                                        entry.type === "CREDIT"
                                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0"
                                          : "bg-[#F41666]/15 text-[#F41666] border-0"
                                      }
                                    >
                                      {entry.type}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                                    {entry.note ?? "—"}
                                  </td>
                                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                    {new Date(
                                      entry.createdAt
                                    ).toLocaleDateString("en", {
                                      dateStyle: "medium",
                                    })}
                                  </td>
                                  <td
                                    className={`px-4 py-3 text-right font-bold whitespace-nowrap ${
                                      entry.type === "CREDIT"
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-[#F41666]"
                                    }`}
                                  >
                                    {entry.type === "CREDIT" ? "+" : "-"}
                                    {Math.round(entry.amount)} pts
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </TabsContent>

            {/* ── Membership tab ─────────────────────────── */}
            <TabsContent value="membership">
              <div className="space-y-6">
                {/* Current active plan */}
                {(() => {
                  const active = client.ClientMembership.find((m) => m.status === "ACTIVE");
                  return (
                    <div className="p-5 rounded-xl bg-card border border-border">
                      <div className="flex items-center gap-2 mb-4">
                        <CreditCard className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-foreground">Current Plan</h3>
                      </div>
                      {active ? (
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-foreground">{active.Plan.name}</p>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {active.Plan.price.toLocaleString("en-US", {
                                  style: "currency",
                                  currency: currency,
                                  maximumFractionDigits: 0,
                                })}
                                /mo · {active.Plan.sessionsPerMonth} sessions/mo
                                {active.Plan.discountPct > 0 &&
                                  ` · ${active.Plan.discountPct}% off extras`}
                              </p>
                            </div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                              Active
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-lg bg-secondary/40 p-3">
                              <p className="text-lg font-bold text-foreground leading-none">
                                {active.Plan.sessionsPerMonth - active.sessionsUsed}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">Sessions left</p>
                            </div>
                            <div className="rounded-lg bg-secondary/40 p-3">
                              <p className="text-lg font-bold text-foreground leading-none">
                                {active.sessionsUsed}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">Used this month</p>
                            </div>
                            <div className="rounded-lg bg-secondary/40 p-3">
                              <p className="text-sm font-semibold text-foreground leading-tight">
                                {active.endDate ?? "—"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">Renews</p>
                            </div>
                          </div>
                          {/* Sessions progress bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Sessions used</span>
                              <span>
                                {active.sessionsUsed} / {active.Plan.sessionsPerMonth}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{
                                  width: `${Math.min(100, (active.sessionsUsed / active.Plan.sessionsPerMonth) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                          {active.Plan.description && (
                            <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
                              {active.Plan.description}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            This client has no active membership.
                          </p>
                          {availablePlans.length > 0 && (
                            <MembershipSection
                              clientId={id}
                              activeMembership={null}
                              availablePlans={availablePlans}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Membership history */}
                <div className="p-5 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <CalendarDays className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Membership History</h3>
                  </div>
                  {client.ClientMembership.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No membership history yet.</p>
                  ) : (
                    <div className="rounded-xl border border-border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40">
                          <tr>
                            <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                              Plan
                            </th>
                            <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3 hidden sm:table-cell">
                              Start
                            </th>
                            <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3 hidden sm:table-cell">
                              End
                            </th>
                            <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3 hidden md:table-cell">
                              Sessions
                            </th>
                            <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {client.ClientMembership.map((m) => {
                            const statusMap: Record<string, string> = {
                              ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                              PAUSED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                              CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                            };
                            const sc = statusMap[m.status] ?? "bg-muted text-muted-foreground";
                            return (
                              <tr key={m.id} className="bg-card hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-3 font-medium text-foreground">
                                  {m.Plan.name}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                                  {m.startDate}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                                  {m.endDate ?? "—"}
                                </td>
                                <td className="px-4 py-3 text-center hidden md:table-cell">
                                  <span className="font-semibold text-foreground tabular-nums">
                                    {m.sessionsUsed}
                                  </span>
                                  <span className="text-muted-foreground">
                                    /{m.Plan.sessionsPerMonth}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${sc}`}
                                  >
                                    {m.status.charAt(0) + m.status.slice(1).toLowerCase()}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Enroll in plan (if no active membership) */}
                {!client.ClientMembership.find((m) => m.status === "ACTIVE") &&
                  availablePlans.length > 0 && (
                    <div className="p-5 rounded-xl bg-card border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <CreditCard className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-foreground">Enroll in Plan</h3>
                      </div>
                      <MembershipSection
                        clientId={id}
                        activeMembership={null}
                        availablePlans={availablePlans}
                      />
                    </div>
                  )}
              </div>
            </TabsContent>

            {/* ── Packages tab ───────────────────────────── */}
            <TabsContent value="packages">
              <ClientPackagesSection
                clientId={id}
                clientPackages={clientPackages}
                availablePackages={allPackages}
                currency={currency}
              />
            </TabsContent>

            {/* ── Photos tab ─────────────────────────────── */}
            <TabsContent value="photos">
              <div className="p-6 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Image className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Client Photos</h3>
                </div>
                <PhotoGallery clientId={id} initialPhotos={clientPhotos} />
              </div>
            </TabsContent>

            {/* ── Notes tab ──────────────────────────────── */}
            <TabsContent value="notes">
              <div className="p-6 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <StickyNote className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">
                    Client Notes
                  </h3>
                </div>
                <ClientNotesTimeline
                  clientId={id}
                  initialNotes={parsedNotes}
                />
              </div>

              {/* Trend insight */}
              {totalVisits > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-card border border-border flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-[#F48E16] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Visit summary
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {totalVisits} total visit{totalVisits !== 1 ? "s" : ""},
                      averaging {fmt(totalSpend / totalVisits)} per visit.
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── Tags tab ───────────────────────────────── */}
            <TabsContent value="tags">
              <div className="p-6 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Client Tags</h3>
                </div>
                <ClientTagsInput
                  clientId={id}
                  initialTags={(() => {
                    try {
                      return JSON.parse(client.tags ?? "[]") as string[];
                    } catch {
                      return [];
                    }
                  })()}
                  allTags={allTagsList}
                />
              </div>
            </TabsContent>

            {/* ── Preferences tab ────────────────────────── */}
            <TabsContent value="preferences">
              <div className="space-y-4">
                <div className="p-6 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <Settings2 className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">
                      Client Preferences
                    </h3>
                  </div>
                  {/* Allergy alert inside preferences panel */}
                  {hasAllergyAlert && (
                    <AllergyAlertBadge
                      preferences={prefsObj}
                      className="mb-4"
                    />
                  )}
                  <ClientPreferencesPanel
                    clientId={id}
                    initialPreferences={prefsObj as ExtendedClientPreferences}
                    staffOptions={allStaff}
                  />
                </div>

                {/* Client Flags */}
                <div className="p-6 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <Crown className="w-5 h-5 text-[#F48E16]" />
                    <h3 className="font-semibold text-foreground">
                      Client Flags
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Flags affect how this client appears in lists and whether
                    they receive automated reminders.
                  </p>
                  <ClientFlagsToggle
                    clientId={id}
                    isVip={client.isVip}
                    doNotContact={client.doNotContact}
                  />
                </div>
              </div>
            </TabsContent>

            {/* ── Communications tab ─────────────────────── */}
            <TabsContent value="communications">
              <CommunicationTab
                clientId={id}
                clientName={client.name}
                clientPhone={client.phone}
                communications={communications}
              />
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </div>
  );
}
