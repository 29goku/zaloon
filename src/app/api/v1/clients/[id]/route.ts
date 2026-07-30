import { prisma } from "@/lib/prisma";
import { type NextRequest } from "next/server";

// GET /api/v1/clients/[id]
// Returns client with appointment history
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

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        Appointment: {
          orderBy: [{ date: "desc" }, { startTime: "desc" }],
          include: {
            Staff: { select: { id: true, name: true } },
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
        },
        ClientMembership: {
          include: {
            Plan: {
              select: {
                id: true,
                name: true,
                price: true,
                sessionsPerMonth: true,
                discountPct: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!client) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }

    return Response.json({ data: client });
  } catch (err) {
    console.error("[GET /api/v1/clients/[id]]", err);
    return Response.json(
      { error: "Failed to fetch client" },
      { status: 500 }
    );
  }
}
