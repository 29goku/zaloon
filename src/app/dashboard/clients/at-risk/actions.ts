"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createWinBackCampaign(
  clientIds: string[],
  campaignName: string
): Promise<{ success: boolean; error?: string; id?: string }> {
  if (!clientIds.length) {
    return { success: false, error: "No clients selected" };
  }

  try {
    const salon = await prisma.salon.findFirst({
      select: { id: true, name: true, slug: true },
    });
    if (!salon) return { success: false, error: "No salon found" };

    const bookingLink = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/book/${salon.slug}`;
    const message = `Hi! We miss you at ${salon.name}. It's been a while since your last visit. Book your next appointment now and get pampered: ${bookingLink}`;

    const campaign = await prisma.campaign.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
        name: campaignName,
        type: "WIN_BACK",
        status: "DRAFT",
        channel: "SMS",
        message,
        targetFilter: JSON.stringify({ clientIds }),
        recipientCount: clientIds.length,
      },
    });

    revalidatePath("/dashboard/clients/at-risk");
    return { success: true, id: campaign.id };
  } catch (err) {
    console.error("[createWinBackCampaign]", err);
    return { success: false, error: "Failed to create campaign" };
  }
}
