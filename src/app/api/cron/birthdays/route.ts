import { randomUUID } from "crypto";
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
  const todayMonth = now.getMonth() + 1; // 1-12
  const todayDay = now.getDate();

  // Scheduled for today at 10:00 AM (local time)
  const scheduledAt = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    10,
    0,
    0,
    0
  );

  // Start/end of today for deduplication check
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Find the default salon
  const salon = await prisma.salon.findFirst({ select: { id: true, name: true } });
  if (!salon) {
    return Response.json({ error: "No salon found" }, { status: 500 });
  }

  // Find clients whose birthday month+day matches today
  // SQLite stores DateTime as ISO strings; we filter in JS after fetching
  const allClients = await prisma.client.findMany({
    where: {
      birthday: { not: null },
      doNotContact: false,
    },
    select: {
      id: true,
      name: true,
      birthday: true,
      email: true,
    },
  });

  const birthdayClients = allClients.filter((c) => {
    if (!c.birthday) return false;
    const bday = new Date(c.birthday);
    return bday.getMonth() + 1 === todayMonth && bday.getDate() === todayDay;
  });

  let created = 0;
  const skipped: string[] = [];

  for (const client of birthdayClients) {
    // Deduplicate: check if a birthday reminder for this client already exists today
    const existing = await prisma.reminder.findFirst({
      where: {
        clientId: client.id,
        type: "WHATSAPP",
        scheduledAt: {
          gte: todayStart,
          lte: todayEnd,
        },
        message: { contains: "birthday" },
      },
    });

    if (existing) {
      skipped.push(client.id);
      continue;
    }

    const message = `Happy Birthday, ${client.name}! Wishing you a wonderful day. We'd love to celebrate with you — book a special appointment at ${salon.name} today!`;

    await prisma.reminder.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
        clientId: client.id,
        appointmentId: null,
        type: "WHATSAPP",
        status: "PENDING",
        message,
        scheduledAt,
      },
    });

    // Send birthday email if client has an email address
    if (client.email) {
      const subject = `Happy Birthday, ${client.name}!`;
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e91e8c;">Happy Birthday, ${client.name}!</h2>
          <p>${message}</p>
          <p style="color: #666; font-size: 12px;">You received this because you are a valued client of ${salon.name}.</p>
        </div>
      `;
      sendEmail(client.email, subject, html).catch((err) =>
        console.error("[cron/birthdays] email send error", err)
      );
    }

    created++;
  }

  return Response.json({
    created,
    skipped: skipped.length,
    timestamp: now.toISOString(),
    date: `${now.getFullYear()}-${String(todayMonth).padStart(2, "0")}-${String(todayDay).padStart(2, "0")}`,
  });
}
