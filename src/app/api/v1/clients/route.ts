import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { type NextRequest } from "next/server";

// GET /api/v1/clients?search=...&limit=20
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key") ?? request.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.API_SECRET_KEY && apiKey !== process.env.API_SECRET_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") ?? "";
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);

    const salon = await prisma.salon.findFirst();
    if (!salon) {
      return Response.json({ error: "No salon found" }, { status: 404 });
    }

    const clients = await prisma.client.findMany({
      where: {
        salonId: salon.id,
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { phone: { contains: search } },
                { email: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
      take: limit,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        birthday: true,
        loyaltyPoints: true,
        createdAt: true,
      },
    });

    return Response.json({ data: clients });
  } catch (err) {
    console.error("[GET /api/v1/clients]", err);
    return Response.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

// POST /api/v1/clients
// Body: { name: string; phone?: string; email?: string; birthday?: string; notes?: string }
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key") ?? request.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.API_SECRET_KEY && apiKey !== process.env.API_SECRET_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, phone, email, birthday, notes } = body as {
      name?: string;
      phone?: string;
      email?: string;
      birthday?: string;
      notes?: string;
    };

    if (!name || typeof name !== "string" || name.trim() === "") {
      return Response.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Invalid email address" }, { status: 400 });
    }

    const salon = await prisma.salon.findFirst();
    if (!salon) {
      return Response.json({ error: "No salon found" }, { status: 404 });
    }

    const client = await prisma.client.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        birthday: birthday ? new Date(birthday) : null,
        notes: notes?.trim() || null,
      },
    });

    return Response.json({ data: client }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/clients]", err);
    return Response.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
