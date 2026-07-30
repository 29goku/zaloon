import { prisma } from "@/lib/prisma";

// GET /api/v1/staff
// Returns all active staff with their services and shifts
export async function GET(request: Request) {
  const apiKey = request.headers.get("x-api-key") ?? request.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.API_SECRET_KEY && apiKey !== process.env.API_SECRET_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) {
      return Response.json({ error: "No salon found" }, { status: 404 });
    }

    const staff = await prisma.staff.findMany({
      where: { salonId: salon.id },
      orderBy: { name: "asc" },
      include: {
        StaffService: {
          include: {
            Service: {
              select: {
                id: true,
                name: true,
                price: true,
                durationMins: true,
                active: true,
              },
            },
          },
        },
        Shift: {
          orderBy: { dayOfWeek: "asc" },
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    return Response.json({ data: staff });
  } catch (err) {
    console.error("[GET /api/v1/staff]", err);
    return Response.json(
      { error: "Failed to fetch staff" },
      { status: 500 }
    );
  }
}
