import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10", 10), 50);

  try {
    const salon = await prisma.salon.findFirst({ select: { id: true } });
    if (!salon) return NextResponse.json([]);

    const clients = await prisma.client.findMany({
      where: {
        salonId: salon.id,
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { phone: { contains: q } },
                { email: { contains: q } },
              ],
            }
          : {}),
      },
      select: { id: true, name: true, phone: true, email: true },
      take: limit,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(clients);
  } catch (err) {
    console.error("[GET /api/clients/search]", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
