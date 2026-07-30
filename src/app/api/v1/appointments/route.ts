import { prisma } from "@/lib/prisma";
import { type NextRequest } from "next/server";

// GET /api/v1/appointments?date=YYYY-MM-DD&staffId=...&status=...
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key") ?? request.headers.get("authorization")?.replace("Bearer ", "");
  if (apiKey !== process.env.API_SECRET_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const date = searchParams.get("date");
    const staffId = searchParams.get("staffId");
    const status = searchParams.get("status");

    const salon = await prisma.salon.findFirst();
    if (!salon) {
      return Response.json({ error: "No salon found" }, { status: 404 });
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        salonId: salon.id,
        ...(date ? { date } : {}),
        ...(staffId ? { staffId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      include: {
        Client: {
          select: { id: true, name: true, phone: true, email: true },
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
      },
    });

    return Response.json({ data: appointments });
  } catch (err) {
    console.error("[GET /api/v1/appointments]", err);
    return Response.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}
