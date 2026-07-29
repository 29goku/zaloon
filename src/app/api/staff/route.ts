import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const excludeId = req.nextUrl.searchParams.get("excludeId");
  try {
    const staff = await prisma.staff.findMany({
      where: excludeId ? { id: { not: excludeId } } : undefined,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(staff);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
