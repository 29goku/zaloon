import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [clients, appointments, services, staff, invoices] = await Promise.all([
      prisma.client.findMany(),
      prisma.appointment.findMany({ include: { AppointmentService: true } }),
      prisma.service.findMany(),
      prisma.staff.findMany(),
      prisma.invoice.findMany(),
    ]);

    const payload = JSON.stringify(
      { clients, appointments, services, staff, invoices, exportedAt: new Date().toISOString() },
      null,
      2
    );

    return new Response(payload, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="zaloon-backup.json"',
      },
    });
  } catch (err) {
    console.error("[GET /api/export/backup]", err);
    return new Response(JSON.stringify({ error: "Failed to generate backup" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
