import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) {
      return NextResponse.json([], { status: 200 });
    }

    const categories = await prisma.serviceCategory.findMany({
      where: { salonId: salon.id },
      include: { Service: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(categories);
  } catch {
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}
