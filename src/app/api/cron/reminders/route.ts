import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Optional cron secret check
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const inFiveMinutes = new Date(now.getTime() + 5 * 60 * 1000);

  // Find all PENDING reminders scheduled for within the next 5 minutes
  const due = await prisma.reminder.findMany({
    where: {
      status: "PENDING",
      scheduledAt: { lte: inFiveMinutes },
    },
    include: { Appointment: { include: { Client: true, Staff: true } } },
    take: 50,
  });

  // "Send" each reminder (mark as SENT — actual delivery is out of scope)
  let sent = 0;
  for (const reminder of due) {
    await prisma.reminder.update({
      where: { id: reminder.id },
      data: { status: "SENT", sentAt: now },
    });
    sent++;
  }

  return Response.json({ processed: sent, timestamp: now.toISOString() });
}
