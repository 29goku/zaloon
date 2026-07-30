import { prisma } from "@/lib/prisma";
import { type NextRequest } from "next/server";

const VALID_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"];

// GET /api/v1/appointments/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = request.headers.get("x-api-key") ?? request.headers.get("authorization")?.replace("Bearer ", "");
  if (apiKey !== process.env.API_SECRET_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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
          },
        },
        Staff: {
          select: { id: true, name: true, phone: true },
        },
        AppointmentService: {
          include: {
            Service: {
              select: {
                id: true,
                name: true,
                price: true,
                durationMins: true,
              },
            },
          },
        },
        Invoice: {
          select: {
            id: true,
            total: true,
            paymentMethod: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!appointment) {
      return Response.json({ error: "Appointment not found" }, { status: 404 });
    }

    return Response.json({ data: appointment });
  } catch (err) {
    console.error("[GET /api/v1/appointments/[id]]", err);
    return Response.json(
      { error: "Failed to fetch appointment" },
      { status: 500 }
    );
  }
}

// PATCH /api/v1/appointments/[id]
// Body: { status?: string; notes?: string }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = request.headers.get("x-api-key") ?? request.headers.get("authorization")?.replace("Bearer ", "");
  if (apiKey !== process.env.API_SECRET_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const body = await request.json();
    const { status, notes } = body as { status?: string; notes?: string };

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return Response.json(
        {
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Appointment not found" }, { status: 404 });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(notes !== undefined ? { notes: notes ?? null } : {}),
      },
      include: {
        Client: {
          select: { id: true, name: true, phone: true, email: true },
        },
        Staff: { select: { id: true, name: true } },
        AppointmentService: {
          include: {
            Service: {
              select: { id: true, name: true, price: true, durationMins: true },
            },
          },
        },
      },
    });

    return Response.json({ data: updated });
  } catch (err) {
    console.error("[PATCH /api/v1/appointments/[id]]", err);
    return Response.json(
      { error: "Failed to update appointment" },
      { status: 500 }
    );
  }
}
