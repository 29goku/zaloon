import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Most recent SENT reminder's sentAt — treat as "last run"
  const lastSent = await prisma.reminder.findFirst({
    where: { status: "SENT", sentAt: { not: null } },
    orderBy: { sentAt: "desc" },
    select: { sentAt: true },
  });

  // Count of reminders sent today
  const processedToday = await prisma.reminder.count({
    where: {
      status: "SENT",
      sentAt: { gte: todayStart, lte: todayEnd },
    },
  });

  return Response.json({
    lastRun: lastSent?.sentAt?.toISOString() ?? null,
    processedToday,
  });
}
