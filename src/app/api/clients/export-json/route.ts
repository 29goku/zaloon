import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) {
      return NextResponse.json([], { status: 200 });
    }

    const rawClients = await prisma.client.findMany({
      where: { salonId: salon.id },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { Appointment: true } },
        Appointment: {
          select: { totalAmount: true, date: true },
          orderBy: { date: "desc" },
        },
        LedgerEntry: { select: { type: true, amount: true } },
      },
    });

    const clients = rawClients.map((c) => {
      const ledgerBalance = c.LedgerEntry.reduce((sum, entry) => {
        return entry.type === "CREDIT" ? sum + entry.amount : sum - entry.amount;
      }, 0);

      const totalSpent = c.Appointment.reduce((sum, a) => sum + a.totalAmount, 0);
      const lastVisit = c.Appointment.length > 0 ? c.Appointment[0].date : null;

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        birthday: c.birthday,
        anniversary: c.anniversary,
        notes: c.notes,
        createdAt: c.createdAt,
        loyaltyPoints: c.loyaltyPoints,
        isVip: c.isVip,
        doNotContact: c.doNotContact,
        tags: c.tags,
        _count: { Appointment: c._count.Appointment ?? 0 },
        ledgerBalance,
        totalSpent,
        lastVisit,
      };
    });

    return NextResponse.json(clients);
  } catch (err) {
    console.error("[GET /api/clients/export-json]", err);
    return NextResponse.json({ error: "Failed to export clients" }, { status: 500 });
  }
}
