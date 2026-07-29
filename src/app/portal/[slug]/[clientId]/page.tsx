import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getClientTier, getPointsToNextTier, LOYALTY_TIERS } from "@/lib/loyalty-tiers";
import { ClientCancelButton } from "./cancel-button";

// ─── Shared types ─────────────────────────────────────────────────────────────

type PortalAppointment = {
  id: string;
  date: string;
  startTime: string;
  totalAmount: number;
  status: string;
  Staff: { id: string; name: string };
  AppointmentService: { Service: { id: string; name: string } }[];
  Review?: { id: string; rating: number } | null;
};

type LedgerRow = {
  id: string;
  type: string;
  amount: number;
  note: string | null;
  createdAt: Date;
};

type ClientMembershipRow = {
  id: string;
  sessionsUsed: number;
  status: string;
  endDate: string | null;
  Plan: {
    name: string;
    sessionsPerMonth: number;
    description: string | null;
  };
};

type ClientRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  birthday: Date | null;
  loyaltyPoints: number;
  ClientMembership: ClientMembershipRow[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

/** Returns true if the appointment is more than 24h in the future */
function isCancellable(date: string, startTime: string): boolean {
  const apptTime = new Date(`${date}T${startTime}`);
  return apptTime.getTime() - Date.now() > 24 * 60 * 60 * 1000;
}

function buildGoogleCalendarLink(
  date: string,
  startTime: string,
  salonName: string,
  services: string
): string {
  const [year, month, day] = date.split("-").map(Number);
  const [h, m] = startTime.split(":").map(Number);
  const start = new Date(year, month - 1, day, h, m);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `${services} at ${salonName}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `Appointment at ${salonName}`,
  });

  return `https://www.google.com/calendar/render?${p.toString()}`;
}

// ─── Tier badge ───────────────────────────────────────────────────────────────

const TIER_STYLES: Record<string, string> = {
  Bronze: "bg-amber-100 text-amber-800 border border-amber-200",
  Silver: "bg-slate-100 text-slate-700 border border-slate-200",
  Gold: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  Platinum: "bg-purple-100 text-purple-800 border border-purple-200",
};

function TierBadge({ tier }: { tier: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        TIER_STYLES[tier] ?? "bg-stone-100 text-stone-600 border border-stone-200"
      }`}
    >
      {tier}
    </span>
  );
}

// ─── Data fetch ───────────────────────────────────────────────────────────────

async function getClientDashboard(slug: string, clientId: string) {
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });
  if (!salon) return null;

  const client = await prisma.client.findFirst({
    where: { id: clientId, salonId: salon.id },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      birthday: true,
      loyaltyPoints: true,
      ClientMembership: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          Plan: {
            select: {
              name: true,
              sessionsPerMonth: true,
              description: true,
            },
          },
        },
      },
    },
  });
  if (!client) return null;

  const [upcoming, past, ledger] = await Promise.all([
    prisma.appointment.findMany({
      where: { clientId, status: "SCHEDULED" },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: 20,
      select: {
        id: true,
        date: true,
        startTime: true,
        totalAmount: true,
        status: true,
        Staff: { select: { id: true, name: true } },
        AppointmentService: {
          select: { Service: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.appointment.findMany({
      where: { clientId, status: "COMPLETED" },
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
      take: 10,
      select: {
        id: true,
        date: true,
        startTime: true,
        totalAmount: true,
        status: true,
        Staff: { select: { id: true, name: true } },
        AppointmentService: {
          select: { Service: { select: { id: true, name: true } } },
        },
        Review: { select: { id: true, rating: true } },
      },
    }),
    prisma.ledgerEntry.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        type: true,
        amount: true,
        note: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    salon,
    client: client as ClientRow,
    upcoming: upcoming as PortalAppointment[],
    past: past as PortalAppointment[],
    ledger: ledger as LedgerRow[],
  };
}

// ─── Star rating ──────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-400 text-xs">
      {"★".repeat(rating)}
      {"☆".repeat(5 - rating)}
    </span>
  );
}

// ─── Section: Summary cards ───────────────────────────────────────────────────

function SummaryCards({
  totalVisits,
  loyaltyPoints,
  membershipStatus,
}: {
  totalVisits: number;
  loyaltyPoints: number;
  membershipStatus: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-xl border border-stone-100 bg-white p-4 shadow-sm text-center">
        <p className="text-2xl font-bold text-stone-900">{totalVisits}</p>
        <p className="text-xs text-stone-500 mt-0.5">Total visits</p>
      </div>
      <div className="rounded-xl border border-stone-100 bg-white p-4 shadow-sm text-center">
        <p className="text-2xl font-bold text-rose-500">{loyaltyPoints}</p>
        <p className="text-xs text-stone-500 mt-0.5">Loyalty pts</p>
      </div>
      <div className="rounded-xl border border-stone-100 bg-white p-4 shadow-sm text-center">
        <p
          className={`text-sm font-bold ${
            membershipStatus === "Active" ? "text-green-600" : "text-stone-400"
          }`}
        >
          {membershipStatus}
        </p>
        <p className="text-xs text-stone-500 mt-0.5">Membership</p>
      </div>
    </div>
  );
}

// ─── Section: Upcoming appointments ──────────────────────────────────────────

function UpcomingSection({
  appointments,
  clientId,
  slug,
  salonName,
}: {
  appointments: PortalAppointment[];
  clientId: string;
  slug: string;
  salonName: string;
}) {
  if (appointments.length === 0) {
    return (
      <section id="appointments">
        <h2 className="mb-3 text-base font-semibold text-stone-900">
          Upcoming appointments
        </h2>
        <div className="rounded-xl border border-stone-100 bg-white px-5 py-8 text-center shadow-sm">
          <p className="text-stone-400 text-sm">No upcoming appointments.</p>
          <Link
            href={`/book/${slug}`}
            className="mt-3 inline-flex text-sm font-medium text-rose-500 hover:underline"
          >
            Book one now
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section id="appointments">
      <h2 className="mb-3 text-base font-semibold text-stone-900">
        Upcoming appointments
      </h2>
      <div className="space-y-3">
        {appointments.map((appt) => {
          const services = appt.AppointmentService.map(
            (as) => as.Service.name
          ).join(", ") || "—";
          const cancellable = isCancellable(appt.date, appt.startTime);
          const calLink = buildGoogleCalendarLink(
            appt.date,
            appt.startTime,
            salonName,
            services
          );

          return (
            <div
              key={appt.id}
              className="rounded-xl border border-stone-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-stone-900 text-sm truncate">
                    {services}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {formatDate(appt.date)} at {formatTime(appt.startTime)}
                  </p>
                  <p className="text-xs text-stone-500">
                    with {appt.Staff.name}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-stone-900">
                    {formatCurrency(appt.totalAmount)}
                  </p>
                  <span className="inline-block mt-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                    Scheduled
                  </span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {cancellable ? (
                  <ClientCancelButton
                    appointmentId={appt.id}
                    clientId={clientId}
                  />
                ) : (
                  <span className="text-xs text-stone-400">
                    Cancellation window passed
                  </span>
                )}
                <a
                  href={calLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  Add to Calendar
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Section: Past appointments ───────────────────────────────────────────────

function PastSection({
  appointments,
  slug,
  clientId,
}: {
  appointments: PortalAppointment[];
  slug: string;
  clientId: string;
}) {
  if (appointments.length === 0) {
    return (
      <section id="history">
        <h2 className="mb-3 text-base font-semibold text-stone-900">
          Past appointments
        </h2>
        <div className="rounded-xl border border-stone-100 bg-white px-5 py-8 text-center shadow-sm">
          <p className="text-stone-400 text-sm">No past appointments yet.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="history">
      <h2 className="mb-3 text-base font-semibold text-stone-900">
        Past appointments
      </h2>
      <div className="space-y-3">
        {appointments.map((appt) => {
          const services = appt.AppointmentService.map(
            (as) => as.Service.name
          ).join(", ") || "—";
          const firstServiceId =
            appt.AppointmentService[0]?.Service.id ?? null;
          const hasReview = !!appt.Review;

          return (
            <div
              key={appt.id}
              className="rounded-xl border border-stone-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-stone-900 text-sm truncate">
                    {services}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {formatDate(appt.date)} at {formatTime(appt.startTime)}
                  </p>
                  <p className="text-xs text-stone-500">
                    with {appt.Staff.name}
                  </p>
                  {hasReview && appt.Review && (
                    <div className="mt-1">
                      <StarRating rating={appt.Review.rating} />
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-stone-900">
                    {formatCurrency(appt.totalAmount)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {!hasReview && (
                  <Link
                    href={`/portal/${slug}/${clientId}/review`}
                    className="rounded-md border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                  >
                    Leave a review
                  </Link>
                )}
                {firstServiceId && (
                  <Link
                    href={`/portal/${slug}/${clientId}/rebook`}
                    className="rounded-md border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    Rebook
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Section: Loyalty points ──────────────────────────────────────────────────

function LoyaltySection({
  loyaltyPoints,
  ledger,
}: {
  loyaltyPoints: number;
  ledger: LedgerRow[];
}) {
  const tier = getClientTier(loyaltyPoints);
  const pointsToNext = getPointsToNextTier(loyaltyPoints);

  const currentTierIndex = LOYALTY_TIERS.findIndex(
    (t) => t.name === tier.name
  );
  const nextTier =
    currentTierIndex < LOYALTY_TIERS.length - 1
      ? LOYALTY_TIERS[currentTierIndex + 1]
      : null;

  const progressPct = nextTier
    ? Math.round(
        ((loyaltyPoints - tier.minPoints) /
          (nextTier.minPoints - tier.minPoints)) *
          100
      )
    : 100;

  return (
    <section id="loyalty">
      <h2 className="mb-3 text-base font-semibold text-stone-900">
        Loyalty points
      </h2>
      <div className="rounded-xl border border-stone-100 bg-white p-5 shadow-sm space-y-5">
        {/* Balance + tier */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-4xl font-bold text-rose-500">{loyaltyPoints}</p>
            <p className="text-xs text-stone-500 mt-0.5">points balance</p>
          </div>
          <TierBadge tier={tier.name} />
        </div>

        {/* Progress bar to next tier */}
        {nextTier && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>{tier.name}</span>
              <span>
                {pointsToNext} pts to {nextTier.name}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-rose-400 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Benefits */}
        {tier.benefits.length > 0 && (
          <div className="text-xs text-stone-500 space-y-0.5">
            <p className="font-medium text-stone-700">
              Your {tier.name} benefits:
            </p>
            {tier.benefits.map((b) => (
              <p key={b} className="pl-2">
                • {b}
              </p>
            ))}
          </div>
        )}

        {/* Points history */}
        {ledger.length > 0 && (
          <div className="border-t border-stone-100 pt-4 space-y-2">
            <p className="text-xs font-medium text-stone-700">
              Recent activity
            </p>
            {ledger.map((entry) => {
              const isCredit = entry.type === "CREDIT";
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-stone-700 truncate">
                      {entry.note ??
                        (isCredit ? "Points earned" : "Points redeemed")}
                    </p>
                    <p className="text-xs text-stone-400">
                      {new Date(entry.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold ${
                      isCredit ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {isCredit ? "+" : "-"}
                    {Math.abs(entry.amount)} pts
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Section: Membership ──────────────────────────────────────────────────────

function MembershipSection({
  membership,
}: {
  membership: ClientMembershipRow;
}) {
  const { Plan, sessionsUsed, status, endDate } = membership;

  return (
    <section id="membership">
      <h2 className="mb-3 text-base font-semibold text-stone-900">
        Membership
      </h2>
      <div className="rounded-xl border border-stone-100 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-stone-900">{Plan.name}</p>
            {Plan.description && (
              <p className="text-xs text-stone-400 mt-0.5">
                {Plan.description}
              </p>
            )}
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              status === "ACTIVE"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-stone-100 text-stone-500 border border-stone-200"
            }`}
          >
            {status === "ACTIVE" ? "Active" : status}
          </span>
        </div>
        <div className="text-sm text-stone-600 space-y-1">
          <p>
            Sessions used:{" "}
            <span className="font-semibold text-stone-900">
              {sessionsUsed} / {Plan.sessionsPerMonth}
            </span>{" "}
            this month
          </p>
          {endDate && (
            <p className="text-xs text-stone-400">
              Renews / expires: {formatDate(endDate)}
            </p>
          )}
        </div>
        <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-rose-400 transition-all"
            style={{
              width: `${Math.min(
                100,
                Math.round((sessionsUsed / Plan.sessionsPerMonth) * 100)
              )}%`,
            }}
          />
        </div>
      </div>
    </section>
  );
}

// ─── Section: Profile ─────────────────────────────────────────────────────────

function ProfileSection({
  client,
  slug,
  clientId,
}: {
  client: ClientRow;
  slug: string;
  clientId: string;
}) {
  return (
    <section id="profile">
      <h2 className="mb-3 text-base font-semibold text-stone-900">Profile</h2>
      <div className="rounded-xl border border-stone-100 bg-white p-5 shadow-sm space-y-3">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-stone-500">Name</dt>
          <dd className="text-stone-900 font-medium">{client.name}</dd>

          {client.phone && (
            <>
              <dt className="text-stone-500">Phone</dt>
              <dd className="text-stone-900">{client.phone}</dd>
            </>
          )}

          {client.email && (
            <>
              <dt className="text-stone-500">Email</dt>
              <dd className="text-stone-900 truncate">{client.email}</dd>
            </>
          )}

          {client.birthday && (
            <>
              <dt className="text-stone-500">Birthday</dt>
              <dd className="text-stone-900">
                {new Date(client.birthday).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                })}
              </dd>
            </>
          )}
        </dl>
        <Link
          href={`/portal/${slug}/${clientId}/profile`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-500 hover:underline mt-1"
        >
          Edit my profile
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ClientDashboardPage({
  params,
}: {
  params: Promise<{ slug: string; clientId: string }>;
}) {
  const { slug, clientId } = await params;
  const data = await getClientDashboard(slug, clientId);

  if (!data) notFound();

  const { salon, client, upcoming, past, ledger } = data;

  const firstName = client.name.split(" ")[0];
  const tier = getClientTier(client.loyaltyPoints);
  const activeMembership = client.ClientMembership[0] ?? null;
  const membershipStatus = activeMembership ? "Active" : "None";

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-8">
      {/* ── Welcome header ── */}
      <div className="rounded-xl border border-stone-100 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-stone-900">
              Welcome back, {firstName}!
            </h1>
            <TierBadge tier={tier.name} />
          </div>
          <Link
            href={`/book/${slug}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 transition-colors shadow-sm shadow-rose-200 shrink-0"
          >
            Book again
          </Link>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <SummaryCards
        totalVisits={past.length}
        loyaltyPoints={client.loyaltyPoints}
        membershipStatus={membershipStatus}
      />

      {/* ── Upcoming appointments ── */}
      <UpcomingSection
        appointments={upcoming}
        clientId={clientId}
        slug={slug}
        salonName={salon.name}
      />

      {/* ── Past appointments ── */}
      <PastSection appointments={past} slug={slug} clientId={clientId} />

      {/* ── Quick actions ── */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-stone-900">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href={`/portal/${slug}/${clientId}/rebook`}
            className="flex flex-col items-center gap-2 rounded-xl border border-stone-100 bg-white p-4 text-center shadow-sm hover:bg-stone-50 transition-colors"
          >
            <svg className="w-6 h-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span className="text-xs font-medium text-stone-600">Rebook last visit</span>
          </Link>

          <Link
            href={`/portal/${slug}/${clientId}/review`}
            className="flex flex-col items-center gap-2 rounded-xl border border-stone-100 bg-white p-4 text-center shadow-sm hover:bg-stone-50 transition-colors"
          >
            <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
            <span className="text-xs font-medium text-stone-600">Leave a review</span>
          </Link>

          <Link
            href={`/portal/${slug}/${clientId}/invoices`}
            className="flex flex-col items-center gap-2 rounded-xl border border-stone-100 bg-white p-4 text-center shadow-sm hover:bg-stone-50 transition-colors"
          >
            <svg className="w-6 h-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
            <span className="text-xs font-medium text-stone-600">My invoices</span>
          </Link>

          <Link
            href={`/portal/${slug}/${clientId}/profile`}
            className="flex flex-col items-center gap-2 rounded-xl border border-stone-100 bg-white p-4 text-center shadow-sm hover:bg-stone-50 transition-colors"
          >
            <svg className="w-6 h-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <span className="text-xs font-medium text-stone-600">Edit profile</span>
          </Link>
        </div>
      </section>

      {/* ── Loyalty ── */}
      <LoyaltySection loyaltyPoints={client.loyaltyPoints} ledger={ledger} />

      {/* ── Membership ── */}
      {activeMembership && (
        <MembershipSection membership={activeMembership} />
      )}

      {/* ── Profile ── */}
      <ProfileSection client={client} slug={slug} clientId={clientId} />
    </div>
  );
}
