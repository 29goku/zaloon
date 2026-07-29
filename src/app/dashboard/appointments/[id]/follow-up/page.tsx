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
  BadgeDollarSign,
} from "lucide-react";
import { RebookForm } from "./rebook-form";
import { ThankYouButton } from "./thank-you-button";
import { CopyLinkButton } from "./copy-link-button";
import { SendSmsReviewButton } from "./send-sms-review-button";
import { AddLoyaltyPointsButton } from "./add-loyalty-points-button";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

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
  const reviewLink = `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/book/${appointment.Salon.slug}/review/${id}`;

  const client = appointment.Client;

  // Total visits = count of all appointments for this client
  const totalVisits = client?._count.Appointment ?? 0;

  // Last visit = most recent completed appointment before this one
  let lastVisitLabel: string | null = null;
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
      lastVisitLabel = new Date(y, m - 1, d).toLocaleDateString("en", { dateStyle: "medium" });
    }
  }

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
      </div>
    </div>
  );
}
