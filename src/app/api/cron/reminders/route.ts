import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

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
    include: {
      Appointment: {
        include: {
          Client: { select: { id: true, name: true, email: true } },
          Staff: true,
        },
      },
    },
    take: 50,
  });

  // Batch-fetch clients for standalone reminders (no appointment, but have a clientId)
  const standaloneClientIds = [
    ...new Set(
      due
        .filter((r) => r.clientId && !r.appointmentId)
        .map((r) => r.clientId as string)
    ),
  ];
  const standaloneClients =
    standaloneClientIds.length > 0
      ? await prisma.client.findMany({
          where: { id: { in: standaloneClientIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
  const clientMap = new Map(standaloneClients.map((c) => [c.id, c]));

  // Send each reminder and mark as SENT
  let sent = 0;
  for (const reminder of due) {
    const apptClient = reminder.Appointment?.Client as
      | { id: string; name: string; email: string | null }
      | null
      | undefined;
    const standaloneClient = reminder.clientId ? clientMap.get(reminder.clientId) : undefined;

    const clientEmail = apptClient?.email ?? standaloneClient?.email ?? null;
    const clientName = apptClient?.name ?? standaloneClient?.name ?? "Valued Client";

    if (clientEmail && (reminder.type === "EMAIL" || reminder.type === "SMS")) {
      const subject = "Appointment Reminder";
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <p>Hi ${clientName},</p>
          <p>${reminder.message}</p>
          <p style="color: #666; font-size: 12px;">You received this message because you have an appointment scheduled.</p>
        </div>
      `;
      // Non-blocking: fire and forget
      sendEmail(clientEmail, subject, html).catch((err) =>
        console.error("[cron/reminders] email send error", err)
      );
    }

    await prisma.reminder.update({
      where: { id: reminder.id },
      data: { status: "SENT", sentAt: now },
    });
    sent++;
  }

  return Response.json({ processed: sent, timestamp: now.toISOString() });
}
