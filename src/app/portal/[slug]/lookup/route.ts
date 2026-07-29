import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientTier } from "@/lib/loyalty-tiers";

// ─── Loyalty tier helper (kept for backwards compat) ─────────────────────────

function loyaltyTier(points: number): string {
  return getClientTier(points).name;
}

// ─── POST /portal/[slug]/lookup ──────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let body: { phone?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const phone = body?.phone?.trim();
  if (!phone) {
    return Response.json({ error: "Phone number is required" }, { status: 400 });
  }

  // Verify the salon exists and scope the lookup to it
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!salon) {
    return Response.json({ error: "Salon not found" }, { status: 404 });
  }

  const client = await prisma.client.findFirst({
    where: { salonId: salon.id, phone },
    select: {
      id: true,
      name: true,
      loyaltyPoints: true,
      Appointment: {
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        where: { status: "SCHEDULED" },
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
        },
      },
    },
  });

  if (!client) {
    return Response.json(
      { error: "No account found for that phone number." },
      { status: 404 }
    );
  }

  // Past 10 completed appointments for recentHistory
  const [recentHistory, ledgerEntries] = await Promise.all([
    prisma.appointment.findMany({
      where: { clientId: client.id, status: "COMPLETED" },
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
        Review: { select: { rating: true } },
      },
    }),
    // Last 5 LOYALTY ledger entries for the portal loyalty page
    prisma.ledgerEntry.findMany({
      where: { clientId: client.id, type: "LOYALTY" },
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

  return Response.json({
    clientId: client.id,
    name: client.name,
    loyaltyPoints: client.loyaltyPoints,
    tier: loyaltyTier(client.loyaltyPoints),
    upcomingAppointments: client.Appointment,
    recentHistory,
    ledgerEntries,
  });
}
