"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WaitlistStatus = "WAITING" | "NOTIFIED" | "BOOKED" | "CANCELLED";

export const WAITLIST_STATUSES: WaitlistStatus[] = [
  "WAITING",
  "NOTIFIED",
  "BOOKED",
  "CANCELLED",
];

export type WaitlistEntry = {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  Client: { id: string; name: string } | null;
  Service: { id: string; name: string } | null;
  Staff: { id: string; name: string } | null;
};

// ─── Schemas ──────────────────────────────────────────────────────────────────

const addWaitlistSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  clientId: z.string().optional(),
  serviceId: z.string().optional(),
  staffId: z.string().optional(),
  note: z.string().optional(),
});

export type AddWaitlistInput = z.infer<typeof addWaitlistSchema>;

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function addToWaitlist(
  data: AddWaitlistInput
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const parsed = addWaitlistSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) {
      return { success: false, error: "No salon found" };
    }

    const { name, phone, clientId, serviceId, staffId, note } = parsed.data;

    const entry = await prisma.waitlist.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
        name,
        phone: phone || null,
        clientId: clientId || null,
        serviceId: serviceId || null,
        staffId: staffId || null,
        note: note || null,
        status: "WAITING",
      },
    });

    revalidatePath("/dashboard/waitlist");
    return { success: true, id: entry.id };
  } catch (err) {
    console.error("[addToWaitlist]", err);
    return { success: false, error: "Failed to add to waitlist" };
  }
}

export async function updateWaitlistStatus(
  id: string,
  status: WaitlistStatus
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Missing waitlist entry id" };
  if (!WAITLIST_STATUSES.includes(status)) {
    return { success: false, error: `Invalid status: ${status}` };
  }

  try {
    await prisma.waitlist.update({
      where: { id },
      data: { status },
    });

    revalidatePath("/dashboard/waitlist");
    return { success: true };
  } catch (err) {
    console.error("[updateWaitlistStatus]", err);
    return { success: false, error: "Failed to update waitlist status" };
  }
}

export async function getWaitlist(
  filter?: WaitlistStatus | "ALL"
): Promise<WaitlistEntry[]> {
  return prisma.waitlist.findMany({
    where:
      filter && filter !== "ALL"
        ? { status: filter }
        : undefined,
    orderBy: { createdAt: "asc" },
    include: {
      Client: { select: { id: true, name: true } },
      Service: { select: { id: true, name: true } },
      Staff: { select: { id: true, name: true } },
    },
  });
}
