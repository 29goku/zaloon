import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientByPhone, type PortalAppointment, type PortalLedgerEntry } from "@/app/actions/clients";
import { CancelButton } from "./CancelButton";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function serviceNames(appt: PortalAppointment): string {
  return appt.AppointmentService.map((as) => as.Service.name).join(", ") || "—";
}

function firstServiceId(appt: PortalAppointment): string | null {
  return appt.AppointmentService[0]?.Service.id ?? null;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-500 text-xs">
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

// ─── Tier badge ───────────────────────────────────────────────────────────────

const tierColors: Record<string, string> = {
  Gold: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Silver: "bg-gray-100 text-gray-700 border-gray-200",
  Bronze: "bg-orange-100 text-orange-700 border-orange-200",
};

function TierBadge({ tier }: { tier: string }) {
  const cls = tierColors[tier] ?? "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}
    >
      {tier}
    </span>
  );
}

// ─── Header card ─────────────────────────────────────────────────────────────

function ClientHeaderCard({
  name,
  tier,
  loyaltyPoints,
  slug,
}: {
  name: string;
  tier: string;
  loyaltyPoints: number;
  slug: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-foreground">{name}</h1>
          <TierBadge tier={tier} />
        </div>
        <div className="text-right shrink-0">
          <p className="text-3xl font-bold text-primary">{loyaltyPoints}</p>
          <p className="text-xs text-muted-foreground">loyalty points</p>
        </div>
      </div>
      <div className="mt-5">
        <Link
          href={`/book/${slug}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Book again
        </Link>
      </div>
    </div>
  );
}

// ─── Upcoming appointments ────────────────────────────────────────────────────

function UpcomingAppointments({
  appointments,
  slug,
}: {
  appointments: PortalAppointment[];
  slug: string;
}) {
  if (appointments.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">Upcoming appointments</h2>
        <div className="rounded-xl border border-border bg-card px-5 py-8 text-center">
          <p className="text-muted-foreground text-sm">No upcoming appointments.</p>
          <Link
            href={`/book/${slug}`}
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Book one now
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-foreground">Upcoming appointments</h2>
      <div className="space-y-3">
        {appointments.map((appt) => (
          <div
            key={appt.id}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-foreground text-sm truncate">
                  {serviceNames(appt)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(appt.date)} at {formatTime(appt.startTime)}
                </p>
                <p className="text-xs text-muted-foreground">with {appt.Staff.name}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(appt.totalAmount)}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <CancelButton appointmentId={appt.id} />
              <Link
                href={`/book/${slug}?reschedule=${appt.id}`}
                className="rounded-md border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                Reschedule
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Past visits ─────────────────────────────────────────────────────────────

function PastVisits({
  appointments,
  slug,
}: {
  appointments: PortalAppointment[];
  slug: string;
}) {
  if (appointments.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">Past visits</h2>
        <div className="rounded-xl border border-border bg-card px-5 py-8 text-center">
          <p className="text-muted-foreground text-sm">No past visits yet.</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-foreground">Past visits</h2>
      <div className="space-y-3">
        {appointments.map((appt) => {
          const serviceId = firstServiceId(appt);
          return (
            <div
              key={appt.id}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">
                    {serviceNames(appt)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(appt.date)} at {formatTime(appt.startTime)}
                  </p>
                  <p className="text-xs text-muted-foreground">with {appt.Staff.name}</p>
                  {appt.Review && (
                    <div className="mt-1">
                      <StarRating rating={appt.Review.rating} />
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-foreground">
                    {formatCurrency(appt.totalAmount)}
                  </p>
                </div>
              </div>
              {serviceId && (
                <div className="mt-3">
                  <Link
                    href={`/book/${slug}?serviceId=${serviceId}`}
                    className="rounded-md border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    Rebook this service
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Points history ───────────────────────────────────────────────────────────

function PointsHistory({ entries }: { entries: PortalLedgerEntry[] }) {
  if (entries.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">Points history</h2>
        <div className="rounded-xl border border-border bg-card px-5 py-8 text-center">
          <p className="text-muted-foreground text-sm">No points activity yet.</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-foreground">Points history</h2>
      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden shadow-sm">
        {entries.map((entry) => {
          const isCredit = entry.type === "CREDIT";
          return (
            <div key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm text-foreground truncate">
                  {entry.note ?? (isCredit ? "Points earned" : "Points redeemed")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(entry.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <span
                className={`shrink-0 text-sm font-semibold ${
                  isCredit ? "text-green-600" : "text-destructive"
                }`}
              >
                {isCredit ? "+" : "-"}
                {Math.abs(entry.amount)} pts
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ClientHistoryPage({
  params,
}: {
  params: Promise<{ slug: string; phone: string }>;
}) {
  const { slug, phone: encodedPhone } = await params;
  const phone = decodeURIComponent(encodedPhone);

  const result = await getClientByPhone(phone);

  if (!result.success) {
    notFound();
  }

  const { data } = result;

  return (
    <main className="min-h-screen bg-background">
      {/* Header nav */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <Link
            href={`/portal/${slug}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            ← Back
          </Link>
          <Link
            href={`/book/${slug}`}
            className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Book appointment
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-lg px-6 py-8 space-y-8">
        <ClientHeaderCard
          name={data.name}
          tier={data.tier}
          loyaltyPoints={data.loyaltyPoints}
          slug={slug}
        />

        <UpcomingAppointments appointments={data.upcomingAppointments} slug={slug} />

        <PastVisits appointments={data.recentHistory} slug={slug} />

        <PointsHistory entries={data.ledgerEntries} />
      </div>
    </main>
  );
}
