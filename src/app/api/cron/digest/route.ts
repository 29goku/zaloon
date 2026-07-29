import { prisma } from "@/lib/prisma";
import { generateDigestData } from "@/lib/generate-digest";

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

    return Response.json({
      success: true,
      frequency: "daily",
      period: data.period,
      recipients: settings.recipients ?? [],
      data,
    });
  } else {
    // Weekly: last 7 days
    periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - 7);
    periodStart.setHours(0, 0, 0, 0);

    const data = await generateDigestData(salon.id, periodStart, now);
    await storeDigest(salon.id, salon.businessHours, data, now);

    return Response.json({
      success: true,
      frequency: "weekly",
      period: data.period,
      recipients: settings.recipients ?? [],
      data,
    });
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
