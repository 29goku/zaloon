import { prisma } from "@/lib/prisma";
import { generateDigestData, type DigestData } from "@/lib/generate-digest";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Optional cron secret check
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const salon = await prisma.salon.findFirst();
  if (!salon) {
    return Response.json({ error: "No salon found" }, { status: 404 });
  }

  // Read digest settings from businessHours JSON
  let settings: {
    enabled?: boolean;
    frequency?: "daily" | "weekly";
    weekday?: number;
    time?: string;
    recipients?: string[];
  } | null = null;

  if (salon.businessHours) {
    try {
      const parsed = JSON.parse(salon.businessHours);
      if (parsed?.__digestSettings) {
        settings = parsed.__digestSettings;
      }
    } catch {
      // ignore
    }
  }

  if (!settings?.enabled) {
    return Response.json({ skipped: true, reason: "Digest not enabled" });
  }

  const now = new Date();
  let periodStart: Date;

  if (settings.frequency === "daily") {
    // Yesterday: from 00:00 to 23:59:59 of yesterday
    periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - 1);
    periodStart.setHours(0, 0, 0, 0);
    const periodEnd = new Date(periodStart);
    periodEnd.setHours(23, 59, 59, 999);

    const data = await generateDigestData(salon.id, periodStart, periodEnd);
    await storeDigest(salon.id, salon.businessHours, data, now);

    const recipients = settings.recipients ?? [];
    sendDigestEmails(recipients, data, salon.name, "Daily").catch((err) =>
      console.error("[cron/digest] email send error", err)
    );

    return Response.json({
      success: true,
      frequency: "daily",
      period: data.period,
      recipients,
      data,
    });
  } else {
    // Weekly: last 7 days
    periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - 7);
    periodStart.setHours(0, 0, 0, 0);

    const data = await generateDigestData(salon.id, periodStart, now);
    await storeDigest(salon.id, salon.businessHours, data, now);

    const recipients = settings.recipients ?? [];
    sendDigestEmails(recipients, data, salon.name, "Weekly").catch((err) =>
      console.error("[cron/digest] email send error", err)
    );

    return Response.json({
      success: true,
      frequency: "weekly",
      period: data.period,
      recipients,
      data,
    });
  }
}

async function sendDigestEmails(
  recipients: string[],
  data: DigestData,
  salonName: string,
  frequency: string
): Promise<void> {
  if (recipients.length === 0) return;

  const subject = `${frequency} Digest — ${salonName} (${data.period.start} to ${data.period.end})`;

  const topStaffRows = data.topStaff
    .map(
      (s) =>
        `<tr><td style="padding:4px 8px;">${s.name}</td><td style="padding:4px 8px;">${s.appointments}</td><td style="padding:4px 8px;">$${s.revenue.toFixed(2)}</td></tr>`
    )
    .join("");

  const html = `
    <div style="font-family: sans-serif; max-width: 640px; margin: 0 auto; color: #1a1a1a;">
      <h2>${frequency} Digest — ${salonName}</h2>
      <p style="color:#555;">${data.period.start} &ndash; ${data.period.end}</p>

      <h3>Revenue</h3>
      <p style="font-size:28px; font-weight:bold; margin:0;">$${data.revenue.total.toFixed(2)}</p>
      ${
        data.revenue.vsLastPeriod !== null
          ? `<p style="color:${data.revenue.vsLastPeriod >= 0 ? "green" : "red"};">${data.revenue.vsLastPeriod >= 0 ? "+" : ""}${data.revenue.vsLastPeriod.toFixed(1)}% vs previous period</p>`
          : ""
      }

      <h3>Appointments</h3>
      <table style="border-collapse:collapse;">
        <tr><td style="padding:4px 8px;">Total</td><td style="padding:4px 8px;"><strong>${data.appointments.total}</strong></td></tr>
        <tr><td style="padding:4px 8px;">Completed</td><td style="padding:4px 8px;">${data.appointments.completed}</td></tr>
        <tr><td style="padding:4px 8px;">Cancelled</td><td style="padding:4px 8px;">${data.appointments.cancelled}</td></tr>
        <tr><td style="padding:4px 8px;">No-show</td><td style="padding:4px 8px;">${data.appointments.noShow}</td></tr>
      </table>

      <h3>New Clients</h3>
      <p>${data.newClients.count} new client${data.newClients.count !== 1 ? "s" : ""}${data.newClients.names.length ? ": " + data.newClients.names.join(", ") : ""}</p>

      ${
        data.topStaff.length > 0
          ? `<h3>Top Staff</h3>
             <table style="border-collapse:collapse; width:100%;">
               <thead><tr style="background:#f5f5f5;"><th style="padding:4px 8px; text-align:left;">Name</th><th style="padding:4px 8px; text-align:left;">Appts</th><th style="padding:4px 8px; text-align:left;">Revenue</th></tr></thead>
               <tbody>${topStaffRows}</tbody>
             </table>`
          : ""
      }

      ${data.avgRating !== null ? `<h3>Avg Rating</h3><p>${data.avgRating.toFixed(1)} / 5</p>` : ""}

      <p style="margin-top:32px; color:#999; font-size:11px;">This digest was generated automatically by ${salonName}.</p>
    </div>
  `;

  for (const email of recipients) {
    if (!email?.trim()) continue;
    try {
      await sendEmail(email.trim(), subject, html);
    } catch (err) {
      console.error("[cron/digest] failed to send to", email, err);
    }
  }
}

async function storeDigest(
  salonId: string,
  businessHours: string | null,
  data: unknown,
  generatedAt: Date
) {
  let existing: Record<string, unknown> = {};
  if (businessHours) {
    try {
      const prev = JSON.parse(businessHours);
      if (prev && typeof prev === "object" && !Array.isArray(prev)) {
        existing = prev;
      }
    } catch {
      // ignore
    }
  }

  const merged = { ...existing, __lastDigest: { data, generatedAt: generatedAt.toISOString() } };

  await prisma.salon.update({
    where: { id: salonId },
    data: { updatedAt: new Date(), businessHours: JSON.stringify(merged) },
  });
}
