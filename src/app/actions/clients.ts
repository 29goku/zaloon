"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseClientNotes, type NoteType, type ClientNote } from "./clients-constants";
import { getCurrentSalonId } from "@/lib/repositories/base";

const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  birthday: z.string().optional(),
  notes: z.string().optional(),
});

const updateClientSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  birthday: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateClientInput = z.infer<typeof clientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export async function createClient(
  data: CreateClientInput
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const parsed = clientSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const salonId = await getCurrentSalonId();

    const { name, phone, email, birthday, notes } = parsed.data;

    const client = await prisma.client.create({
      data: {
        id: randomUUID(),
        salonId,
        name,
        phone: phone || null,
        email: email || null,
        birthday: birthday ? new Date(birthday) : null,
        notes: notes || null,
      },
    });

    return { success: true, id: client.id };
  } catch (err) {
    console.error("[createClient]", err);
    return { success: false, error: "Failed to create client" };
  }
}

export async function updateClient(
  id: string,
  data: UpdateClientInput
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = updateClientSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const { name, phone, email, birthday, notes } = parsed.data;

    await prisma.client.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(email !== undefined && { email: email || null }),
        ...(birthday !== undefined && {
          birthday: birthday ? new Date(birthday) : null,
        }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    });

    return { success: true };
  } catch (err) {
    console.error("[updateClient]", err);
    return { success: false, error: "Failed to update client" };
  }
}

export async function deleteClient(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await prisma.client.delete({ where: { id } });
    return { success: true };
  } catch (err) {
    console.error("[deleteClient]", err);
    return { success: false, error: "Failed to delete client" };
  }
}

export async function addLoyaltyPoints(
  clientId: string,
  points: number,
  reason?: string
): Promise<{ success: true; newTotal: number; newBalance: number } | { success: false; error: string }> {
  if (!clientId) return { success: false, error: "Missing client id" };
  if (!Number.isInteger(points) || points <= 0) {
    return { success: false, error: "Points must be a positive integer" };
  }

  try {
    const updated = await prisma.client.update({
      where: { id: clientId },
      data: { loyaltyPoints: { increment: points } },
      select: { loyaltyPoints: true },
    });

    // Record in ledger for traceability
    await prisma.ledgerEntry.create({
      data: {
        id: randomUUID(),
        clientId,
        type: "CREDIT",
        amount: points,
        note: reason ? `Points earned: ${reason}` : `Manual loyalty points: +${points} pts`,
      },
    });

    revalidatePath(`/dashboard/clients/${clientId}`);
    return { success: true, newTotal: updated.loyaltyPoints, newBalance: updated.loyaltyPoints };
  } catch (err) {
    console.error("[addLoyaltyPoints]", err);
    return { success: false, error: "Failed to add loyalty points" };
  }
}

export async function updateClientNotes(
  clientId: string,
  notes: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!clientId) return { success: false, error: "Missing client id" };

  try {
    await prisma.client.update({
      where: { id: clientId },
      data: { notes: notes.trim() || null },
    });

    revalidatePath(`/dashboard/clients/${clientId}`);
    return { success: true };
  } catch (err) {
    console.error("[updateClientNotes]", err);
    return { success: false, error: "Failed to update notes" };
  }
}

export type ImportClientInput = {
  name: string;
  phone?: string;
  email?: string;
  birthday?: string;
  notes?: string;
};

export async function importClients(
  clients: ImportClientInput[]
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  let salonId: string;
  try {
    salonId = await getCurrentSalonId();
  } catch {
    return { imported: 0, skipped: 0, errors: ["No salon found"] };
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const raw of clients) {
    const name = raw.name?.trim();
    if (!name) {
      errors.push(`Skipped row with empty name`);
      skipped++;
      continue;
    }

    // Skip if phone already exists
    if (raw.phone?.trim()) {
      const existing = await prisma.client.findFirst({
        where: { salonId, phone: raw.phone.trim() },
        select: { id: true },
      });
      if (existing) {
        skipped++;
        continue;
      }
    }

    try {
      await prisma.client.create({
        data: {
          id: randomUUID(),
          salonId,
          name,
          phone: raw.phone?.trim() || null,
          email: raw.email?.trim() || null,
          birthday: raw.birthday?.trim() ? new Date(raw.birthday.trim()) : null,
          notes: raw.notes?.trim() || null,
        },
      });
      imported++;
    } catch (err) {
      console.error("[importClients] row error", err);
      errors.push(`Failed to import "${name}"`);
      skipped++;
    }
  }

  revalidatePath("/dashboard/clients");
  return { imported, skipped, errors };
}

export async function deleteClients(
  ids: string[]
): Promise<{ success: true; deleted: number } | { success: false; error: string }> {
  if (!ids.length) return { success: true, deleted: 0 };
  try {
    const result = await prisma.client.deleteMany({
      where: { id: { in: ids } },
    });
    revalidatePath("/dashboard/clients");
    return { success: true, deleted: result.count };
  } catch (err) {
    console.error("[deleteClients]", err);
    return { success: false, error: "Failed to delete clients" };
  }
}

// Alias used in new code — forwards to addLoyaltyPoints
export async function awardLoyaltyPoints(
  clientId: string,
  points: number,
  reason: string
): Promise<{ success: true; newTotal: number } | { success: false; error: string }> {
  return addLoyaltyPoints(clientId, points, reason);
}

export async function getLoyaltyLeaderboard(
  limit = 10
): Promise<
  Array<{
    id: string;
    name: string;
    loyaltyPoints: number;
    visitCount: number;
    lifetimeSpend: number;
  }>
> {
  const clients = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      loyaltyPoints: true,
      Invoice: { select: { total: true } },
      Appointment: { select: { id: true } },
    },
    orderBy: { loyaltyPoints: "desc" },
    take: limit,
  });

  return clients.map((c) => ({
    id: c.id,
    name: c.name,
    loyaltyPoints: c.loyaltyPoints,
    visitCount: c.Appointment.length,
    lifetimeSpend: c.Invoice.reduce((sum, inv) => sum + inv.total, 0),
  }));
}

export async function redeemLoyaltyPoints(
  clientId: string,
  points: number
): Promise<{ success: true; newTotal: number } | { success: false; error: string }> {
  if (!clientId) return { success: false, error: "Missing client id" };
  if (!Number.isInteger(points) || points <= 0) {
    return { success: false, error: "Points must be a positive integer" };
  }

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { loyaltyPoints: true },
    });

    if (!client) return { success: false, error: "Client not found" };
    if (client.loyaltyPoints < points) {
      return {
        success: false,
        error: `Insufficient points. Client has ${client.loyaltyPoints} pts, requested ${points} pts.`,
      };
    }

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: { loyaltyPoints: { decrement: points } },
      select: { loyaltyPoints: true },
    });

    await prisma.ledgerEntry.create({
      data: {
        id: randomUUID(),
        clientId,
        type: "DEBIT",
        amount: points,
        note: `Points redeemed: ${points} pts`,
      },
    });

    return { success: true, newTotal: updated.loyaltyPoints };
  } catch (err) {
    console.error("[redeemLoyaltyPoints]", err);
    return { success: false, error: "Failed to redeem loyalty points" };
  }
}

// ─── Tags ────────────────────────────────────────────────────────────────────

export async function updateClientTags(
  clientId: string,
  tags: string[]
): Promise<{ success: true } | { success: false; error: string }> {
  if (!clientId) return { success: false, error: "Missing client id" };
  try {
    await prisma.client.update({
      where: { id: clientId },
      data: { tags: JSON.stringify(tags) },
    });
    revalidatePath(`/dashboard/clients/${clientId}`);
    return { success: true };
  } catch (err) {
    console.error("[updateClientTags]", err);
    return { success: false, error: "Failed to update tags" };
  }
}

// ─── Preferences ─────────────────────────────────────────────────────────────

export type ClientPreferences = {
  preferredStaff?: string;
  preferredTime?: "morning" | "afternoon" | "evening" | "";
  communicationPref?: "sms" | "email" | "whatsapp" | "none" | "";
  allergies?: string;
  hairType?: "straight" | "wavy" | "curly" | "coily" | "";
  colorHistory?: string;
};

export async function updateClientPreferences(
  clientId: string,
  preferences: ClientPreferences
): Promise<{ success: true } | { success: false; error: string }> {
  if (!clientId) return { success: false, error: "Missing client id" };
  try {
    await prisma.client.update({
      where: { id: clientId },
      data: { preferences: JSON.stringify(preferences) },
    });
    revalidatePath(`/dashboard/clients/${clientId}`);
    return { success: true };
  } catch (err) {
    console.error("[updateClientPreferences]", err);
    return { success: false, error: "Failed to update preferences" };
  }
}

// ─── Flags ────────────────────────────────────────────────────────────────────

export async function updateClientFlags(
  clientId: string,
  flags: { isVip?: boolean; doNotContact?: boolean }
): Promise<{ success: true } | { success: false; error: string }> {
  if (!clientId) return { success: false, error: "Missing client id" };
  try {
    await prisma.client.update({
      where: { id: clientId },
      data: {
        ...(flags.isVip !== undefined && { isVip: flags.isVip }),
        ...(flags.doNotContact !== undefined && { doNotContact: flags.doNotContact }),
      },
    });
    revalidatePath(`/dashboard/clients/${clientId}`);
    return { success: true };
  } catch (err) {
    console.error("[updateClientFlags]", err);
    return { success: false, error: "Failed to update flags" };
  }
}

// ─── Notes (timestamped JSON array) ──────────────────────────────────────────

export type { NoteType, ClientNote } from "./clients-constants";

export async function addClientNote(
  clientId: string,
  noteText: string,
  noteType: NoteType = "general",
  isPinned = false
): Promise<{ success: true } | { success: false; error: string }> {
  if (!clientId) return { success: false, error: "Missing client id" };
  if (!noteText.trim()) return { success: false, error: "Note text is required" };

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { notes: true },
    });
    if (!client) return { success: false, error: "Client not found" };

    const existing = parseClientNotes(client.notes);
    const newNote: ClientNote = {
      id: randomUUID(),
      text: noteText.trim(),
      type: noteType,
      isPinned,
      createdAt: new Date().toISOString(),
    };
    // Prepend newest note
    const updated = [newNote, ...existing];

    await prisma.client.update({
      where: { id: clientId },
      data: { notes: JSON.stringify(updated) },
    });

    revalidatePath(`/dashboard/clients/${clientId}`);
    return { success: true };
  } catch (err) {
    console.error("[addClientNote]", err);
    return { success: false, error: "Failed to add note" };
  }
}

export async function deleteClientNote(
  clientId: string,
  noteId: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!clientId) return { success: false, error: "Missing client id" };
  if (!noteId) return { success: false, error: "Missing note id" };

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { notes: true },
    });
    if (!client) return { success: false, error: "Client not found" };

    const notes = parseClientNotes(client.notes).filter((n) => n.id !== noteId);

    await prisma.client.update({
      where: { id: clientId },
      data: { notes: JSON.stringify(notes) },
    });

    revalidatePath(`/dashboard/clients/${clientId}`);
    return { success: true };
  } catch (err) {
    console.error("[deleteClientNote]", err);
    return { success: false, error: "Failed to delete note" };
  }
}

export async function toggleClientNotePin(
  clientId: string,
  noteId: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!clientId) return { success: false, error: "Missing client id" };
  if (!noteId) return { success: false, error: "Missing note id" };

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { notes: true },
    });
    if (!client) return { success: false, error: "Client not found" };

    const notes = parseClientNotes(client.notes).map((n) =>
      n.id === noteId ? { ...n, isPinned: !n.isPinned } : n
    );

    await prisma.client.update({
      where: { id: clientId },
      data: { notes: JSON.stringify(notes) },
    });

    revalidatePath(`/dashboard/clients/${clientId}`);
    return { success: true };
  } catch (err) {
    console.error("[toggleClientNotePin]", err);
    return { success: false, error: "Failed to toggle pin" };
  }
}

// ─── Loyalty tier helper ─────────────────────────────────────────────────────

function loyaltyTier(points: number): string {
  if (points >= 1000) return "Gold";
  if (points >= 400) return "Silver";
  return "Bronze";
}

// ─── Public portal: look up client by phone ──────────────────────────────────

export type ClientPortalData = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  loyaltyPoints: number;
  tier: string;
  upcomingAppointments: PortalAppointment[];
  recentHistory: PortalAppointment[];
  ledgerEntries: PortalLedgerEntry[];
};

export type PortalAppointment = {
  id: string;
  date: string;
  startTime: string;
  totalAmount: number;
  status: string;
  Staff: { id: string; name: string };
  AppointmentService: { Service: { id: string; name: string } }[];
  Review: { rating: number } | null;
};

export type PortalLedgerEntry = {
  id: string;
  type: string;
  amount: number;
  note: string | null;
  createdAt: Date;
};

export async function getClientByPhone(
  phone: string
): Promise<{ success: true; data: ClientPortalData } | { success: false; error: string }> {
  const trimmed = phone?.trim();
  if (!trimmed) return { success: false, error: "Phone number is required" };

  try {
    const salonId = await getCurrentSalonId();

    const client = await prisma.client.findFirst({
      where: { salonId, phone: trimmed },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        loyaltyPoints: true,
      },
    });

    if (!client) {
      return { success: false, error: "No account found for that phone number." };
    }

    const [upcoming, history, ledger] = await Promise.all([
      prisma.appointment.findMany({
        where: { clientId: client.id, status: "SCHEDULED" },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        take: 20,
        select: {
          id: true,
          date: true,
          startTime: true,
          totalAmount: true,
          status: true,
          Staff: { select: { id: true, name: true } },
          AppointmentService: { select: { Service: { select: { id: true, name: true } } } },
          Review: { select: { rating: true } },
        },
      }),
      prisma.appointment.findMany({
        where: { clientId: client.id, status: "COMPLETED" },
        orderBy: [{ date: "desc" }, { startTime: "desc" }],
        take: 10,
        select: {
          id: true,
          date: true,
          startTime: true,
          totalAmount: true,
          status: true,
          Staff: { select: { id: true, name: true } },
          AppointmentService: { select: { Service: { select: { id: true, name: true } } } },
          Review: { select: { rating: true } },
        },
      }),
      prisma.ledgerEntry.findMany({
        where: { clientId: client.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          type: true,
          amount: true,
          note: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      success: true,
      data: {
        ...client,
        tier: loyaltyTier(client.loyaltyPoints),
        upcomingAppointments: upcoming as PortalAppointment[],
        recentHistory: history as PortalAppointment[],
        ledgerEntries: ledger,
      },
    };
  } catch (err) {
    console.error("[getClientByPhone]", err);
    return { success: false, error: "Failed to fetch client data." };
  }
}

// ─── Birthday & Anniversary ────────────────────────────────────────────────────

export async function sendBirthdayWish(
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  if (!clientId) return { success: false, error: "Missing client id" };

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, phone: true },
    });
    if (!client) return { success: false, error: "Client not found" };

    const salonId = await getCurrentSalonId();
    const salonData = await prisma.salon.findUniqueOrThrow({
      where: { id: salonId },
      select: { slug: true },
    });

    const bookingLink = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/book/${salonData.slug}`;
    const message = `Happy Birthday ${client.name}! 🎂 As a gift, enjoy 15% off your next appointment. Book now: ${bookingLink}`;

    const scheduledAt = new Date();
    scheduledAt.setHours(10, 0, 0, 0);

    await prisma.reminder.create({
      data: {
        id: randomUUID(),
        salonId,
        clientId: client.id,
        type: "WHATSAPP",
        status: "PENDING",
        message,
        scheduledAt,
      },
    });

    revalidatePath("/dashboard/clients/birthdays");
    return { success: true };
  } catch (err) {
    console.error("[sendBirthdayWish]", err);
    return { success: false, error: "Failed to send birthday wish" };
  }
}

export async function sendAllBirthdayWishes(): Promise<{ sent: number }> {
  try {
    const salonId = await getCurrentSalonId();
    const salonData = await prisma.salon.findUniqueOrThrow({
      where: { id: salonId },
      select: { slug: true },
    });

    const bookingLink = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/book/${salonData.slug}`;

    // Clients with a birthday set
    const allBirthdayClients = await prisma.client.findMany({
      where: { birthday: { not: null }, salonId },
      select: { id: true, name: true, birthday: true },
    });

    const now = new Date();
    const currentMonth = now.getMonth();

    const birthdayClientsThisMonth = allBirthdayClients.filter((c) => {
      const bday = new Date(c.birthday!);
      return bday.getMonth() === currentMonth;
    });

    // Check who already got a wish today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const alreadySent = await prisma.reminder.findMany({
      where: {
        salonId,
        type: "WHATSAPP",
        message: { contains: "Happy Birthday" },
        scheduledAt: { gte: todayStart, lte: todayEnd },
        clientId: { in: birthdayClientsThisMonth.map((c) => c.id) },
      },
      select: { clientId: true },
    });

    const alreadySentIds = new Set(alreadySent.map((r) => r.clientId));

    const scheduledAt = new Date();
    scheduledAt.setHours(10, 0, 0, 0);

    let sent = 0;
    for (const client of birthdayClientsThisMonth) {
      if (alreadySentIds.has(client.id)) continue;
      const message = `Happy Birthday ${client.name}! 🎂 As a gift, enjoy 15% off your next appointment. Book now: ${bookingLink}`;
      await prisma.reminder.create({
        data: {
          id: randomUUID(),
          salonId,
          clientId: client.id,
          type: "WHATSAPP",
          status: "PENDING",
          message,
          scheduledAt,
        },
      });
      sent++;
    }

    revalidatePath("/dashboard/clients/birthdays");
    return { sent };
  } catch (err) {
    console.error("[sendAllBirthdayWishes]", err);
    return { sent: 0 };
  }
}

export type AnniversaryClient = {
  clientId: string;
  name: string;
  phone: string | null;
  anniversaryDate: Date;
  yearsCount: number;
};

export async function getUpcomingAnniversaries(
  daysAhead: number
): Promise<AnniversaryClient[]> {
  try {
    const salonId = await getCurrentSalonId();

    // Get all clients for this salon
    const clients = await prisma.client.findMany({
      where: { salonId },
      select: {
        id: true,
        name: true,
        phone: true,
        anniversary: true,
        Appointment: {
          orderBy: { date: "asc" },
          take: 1,
          select: { date: true },
        },
      },
    });

    const now = new Date();
    const results: AnniversaryClient[] = [];

    for (const client of clients) {
      // Use anniversary field if set, otherwise first appointment date
      let anniversaryDate: Date | null = null;
      if (client.anniversary) {
        anniversaryDate = new Date(client.anniversary);
      } else if (client.Appointment.length > 0) {
        anniversaryDate = new Date(client.Appointment[0].date + "T00:00:00");
      }
      if (!anniversaryDate) continue;

      // Find the next occurrence of this month/day
      const thisYearAnniv = new Date(
        now.getFullYear(),
        anniversaryDate.getMonth(),
        anniversaryDate.getDate()
      );
      // If already passed this year, check next year
      const candidateDate =
        thisYearAnniv < now
          ? new Date(
              now.getFullYear() + 1,
              anniversaryDate.getMonth(),
              anniversaryDate.getDate()
            )
          : thisYearAnniv;

      const diffMs = candidateDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= daysAhead) {
        const yearsCount = candidateDate.getFullYear() - anniversaryDate.getFullYear();
        results.push({
          clientId: client.id,
          name: client.name,
          phone: client.phone,
          anniversaryDate: candidateDate,
          yearsCount,
        });
      }
    }

    return results.sort(
      (a, b) => a.anniversaryDate.getTime() - b.anniversaryDate.getTime()
    );
  } catch (err) {
    console.error("[getUpcomingAnniversaries]", err);
    return [];
  }
}

// ─── getAllClientTags ─────────────────────────────────────────────────────────

export async function getAllClientTags(): Promise<string[]> {
  try {
    const salonId = await getCurrentSalonId();

    const clients = await prisma.client.findMany({
      where: { salonId },
      select: { tags: true },
    });

    const tagSet = new Set<string>();
    for (const c of clients) {
      if (!c.tags) continue;
      try {
        const parsed = JSON.parse(c.tags);
        if (Array.isArray(parsed)) {
          for (const t of parsed) {
            if (typeof t === "string" && t.trim()) tagSet.add(t.trim());
          }
        }
      } catch {
        /* skip malformed */
      }
    }
    return Array.from(tagSet).sort();
  } catch (err) {
    console.error("[getAllClientTags]", err);
    return [];
  }
}

// ─── bulkAddTag ───────────────────────────────────────────────────────────────

export async function bulkAddTag(
  clientIds: string[],
  tag: string
): Promise<{ success: true; updated: number } | { success: false; error: string }> {
  if (!clientIds.length) return { success: true, updated: 0 };
  const trimmedTag = tag?.trim();
  if (!trimmedTag) return { success: false, error: "Tag is required" };

  try {
    const clients = await prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, tags: true },
    });

    let updated = 0;
    for (const client of clients) {
      let tags: string[] = [];
      try {
        tags = JSON.parse(client.tags ?? "[]") as string[];
      } catch {
        tags = [];
      }
      if (!tags.includes(trimmedTag)) {
        tags.push(trimmedTag);
        await prisma.client.update({
          where: { id: client.id },
          data: { tags: JSON.stringify(tags) },
        });
        updated++;
      }
    }

    revalidatePath("/dashboard/clients");
    return { success: true, updated };
  } catch (err) {
    console.error("[bulkAddTag]", err);
    return { success: false, error: "Failed to add tag" };
  }
}

// ─── Retention analytics ─────────────────────────────────────────────────────

export type RetentionClient = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  lastVisitDate: string;
  daysSince: number;
  totalVisits: number;
  avgSpend: number;
};

export async function getAtRiskClients(): Promise<RetentionClient[]> {
  try {
    const salonId = await getCurrentSalonId();

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const clients = await prisma.client.findMany({
      where: { salonId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        Appointment: {
          where: { status: "COMPLETED" },
          orderBy: { date: "desc" },
          select: { date: true, totalAmount: true },
        },
      },
    });

    // Find upcoming scheduled appointments per client
    const scheduledAppts = await prisma.appointment.findMany({
      where: {
        salonId,
        status: "SCHEDULED",
        date: { gte: todayStr },
      },
      select: { clientId: true },
    });
    const scheduledClientIds = new Set(scheduledAppts.map((a) => a.clientId));

    const results: RetentionClient[] = [];
    for (const c of clients) {
      if (c.Appointment.length === 0) continue;
      if (scheduledClientIds.has(c.id)) continue;

      const lastVisitDate = c.Appointment[0].date;
      const lastDate = new Date(lastVisitDate + "T00:00:00");
      const daysSince = Math.floor(
        (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSince < 45 || daysSince > 90) continue;

      const totalSpend = c.Appointment.reduce((s, a) => s + a.totalAmount, 0);
      const avgSpend = totalSpend / c.Appointment.length;

      results.push({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        lastVisitDate,
        daysSince,
        totalVisits: c.Appointment.length,
        avgSpend,
      });
    }

    return results.sort((a, b) => b.daysSince - a.daysSince);
  } catch (err) {
    console.error("[getAtRiskClients]", err);
    return [];
  }
}

export async function getLostClients(): Promise<RetentionClient[]> {
  try {
    const salonId = await getCurrentSalonId();

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const clients = await prisma.client.findMany({
      where: { salonId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        Appointment: {
          where: { status: "COMPLETED" },
          orderBy: { date: "desc" },
          select: { date: true, totalAmount: true },
        },
      },
    });

    const scheduledAppts = await prisma.appointment.findMany({
      where: {
        salonId,
        status: "SCHEDULED",
        date: { gte: todayStr },
      },
      select: { clientId: true },
    });
    const scheduledClientIds = new Set(scheduledAppts.map((a) => a.clientId));

    const results: RetentionClient[] = [];
    for (const c of clients) {
      if (c.Appointment.length === 0) continue;
      if (scheduledClientIds.has(c.id)) continue;

      const lastVisitDate = c.Appointment[0].date;
      const lastDate = new Date(lastVisitDate + "T00:00:00");
      const daysSince = Math.floor(
        (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSince <= 90) continue;

      const totalSpend = c.Appointment.reduce((s, a) => s + a.totalAmount, 0);
      const avgSpend = totalSpend / c.Appointment.length;

      results.push({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        lastVisitDate,
        daysSince,
        totalVisits: c.Appointment.length,
        avgSpend,
      });
    }

    return results.sort((a, b) => b.daysSince - a.daysSince);
  } catch (err) {
    console.error("[getLostClients]", err);
    return [];
  }
}

export async function sendWinBackMessage(
  clientId: string,
  message?: string
): Promise<{ success: boolean; error?: string }> {
  if (!clientId) return { success: false, error: "Missing client id" };

  try {
    const salonId = await getCurrentSalonId();
    const salonData = await prisma.salon.findUniqueOrThrow({
      where: { id: salonId },
      select: { name: true, slug: true },
    });

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        Appointment: {
          where: { status: "COMPLETED" },
          orderBy: { date: "desc" },
          take: 1,
          select: { date: true },
        },
      },
    });
    if (!client) return { success: false, error: "Client not found" };

    const bookingLink = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/book/${salonData.slug}`;
    const lastDate = client.Appointment[0]?.date ?? "";
    const daysSince = lastDate
      ? Math.floor(
          (Date.now() - new Date(lastDate + "T00:00:00").getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    const winBackMsg =
      message ??
      `Hi ${client.name}! We miss you at ${salonData.name}. It's been ${daysSince ?? "a while"} days since your last visit. Book now: ${bookingLink}`;

    const scheduledAt = new Date();
    scheduledAt.setHours(10, 0, 0, 0);
    if (scheduledAt < new Date()) {
      scheduledAt.setDate(scheduledAt.getDate() + 1);
    }

    await prisma.reminder.create({
      data: {
        id: randomUUID(),
        salonId,
        clientId: client.id,
        type: "WHATSAPP",
        status: "PENDING",
        message: winBackMsg,
        scheduledAt,
      },
    });

    revalidatePath("/dashboard/clients/retention");
    return { success: true };
  } catch (err) {
    console.error("[sendWinBackMessage]", err);
    return { success: false, error: "Failed to send win-back message" };
  }
}

export async function sendBirthdayMessage(
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  if (!clientId) return { success: false, error: "Missing client id" };

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, phone: true },
    });
    if (!client) return { success: false, error: "Client not found" };

    const salonId = await getCurrentSalonId();

    const message = `Happy Birthday ${client.name}! 🎂 Wishing you a wonderful day. As a birthday gift, enjoy a special discount on your next visit. We look forward to seeing you soon!`;

    await prisma.reminder.create({
      data: {
        id: randomUUID(),
        salonId,
        clientId: client.id,
        type: "WHATSAPP",
        status: "PENDING",
        message,
        scheduledAt: new Date(),
      },
    });

    revalidatePath("/dashboard/clients/birthdays");
    return { success: true };
  } catch (err) {
    console.error("[sendBirthdayMessage]", err);
    return { success: false, error: "Failed to send birthday message" };
  }
}

export async function sendBulkWinBack(
  clientIds: string[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const id of clientIds) {
    const result = await sendWinBackMessage(id);
    if (result.success) sent++;
    else failed++;
  }

  revalidatePath("/dashboard/clients/retention");
  return { sent, failed };
}

// ─── deductLoyaltyPoints ──────────────────────────────────────────────────────
// Deducts points from a client and records the reason in the ledger.
// Wraps redeemLoyaltyPoints with an explicit reason parameter.
export async function deductLoyaltyPoints(
  clientId: string,
  points: number,
  reason: string
): Promise<{ success: true; newTotal: number } | { success: false; error: string }> {
  if (!clientId) return { success: false, error: "Missing client id" };
  if (!Number.isInteger(points) || points <= 0) {
    return { success: false, error: "Points must be a positive integer" };
  }

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { loyaltyPoints: true },
    });

    if (!client) return { success: false, error: "Client not found" };
    if (client.loyaltyPoints < points) {
      return {
        success: false,
        error: `Insufficient points. Client has ${client.loyaltyPoints} pts, requested ${points} pts.`,
      };
    }

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: { loyaltyPoints: { decrement: points } },
      select: { loyaltyPoints: true },
    });

    await prisma.ledgerEntry.create({
      data: {
        id: randomUUID(),
        clientId,
        type: "DEBIT",
        amount: points,
        note: `Points redeemed: ${reason}`,
      },
    });

    revalidatePath(`/dashboard/clients/${clientId}`);
    return { success: true, newTotal: updated.loyaltyPoints };
  } catch (err) {
    console.error("[deductLoyaltyPoints]", err);
    return { success: false, error: "Failed to deduct loyalty points" };
  }
}

// ─── Client Photos ────────────────────────────────────────────────────────────

function parsePhotos(preferences: string | null): string[] {
  if (!preferences) return [];
  try {
    const parsed = JSON.parse(preferences);
    if (parsed && Array.isArray(parsed.__photos)) return parsed.__photos as string[];
    return [];
  } catch {
    return [];
  }
}

export async function addClientPhoto(
  clientId: string,
  url: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!clientId) return { success: false, error: "Missing client id" };
  const trimmedUrl = url?.trim();
  if (!trimmedUrl) return { success: false, error: "URL is required" };

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { preferences: true },
    });
    if (!client) return { success: false, error: "Client not found" };

    let prefs: Record<string, unknown> = {};
    try {
      prefs = JSON.parse(client.preferences ?? "{}") as Record<string, unknown>;
    } catch {
      prefs = {};
    }

    const photos = Array.isArray(prefs.__photos) ? (prefs.__photos as string[]) : [];
    if (!photos.includes(trimmedUrl)) {
      photos.push(trimmedUrl);
    }

    await prisma.client.update({
      where: { id: clientId },
      data: { preferences: JSON.stringify({ ...prefs, __photos: photos }) },
    });

    revalidatePath(`/dashboard/clients/${clientId}`);
    return { success: true };
  } catch (err) {
    console.error("[addClientPhoto]", err);
    return { success: false, error: "Failed to add photo" };
  }
}

export async function removeClientPhoto(
  clientId: string,
  url: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!clientId) return { success: false, error: "Missing client id" };
  if (!url) return { success: false, error: "URL is required" };

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { preferences: true },
    });
    if (!client) return { success: false, error: "Client not found" };

    let prefs: Record<string, unknown> = {};
    try {
      prefs = JSON.parse(client.preferences ?? "{}") as Record<string, unknown>;
    } catch {
      prefs = {};
    }

    const photos = Array.isArray(prefs.__photos)
      ? (prefs.__photos as string[]).filter((p) => p !== url)
      : [];

    await prisma.client.update({
      where: { id: clientId },
      data: { preferences: JSON.stringify({ ...prefs, __photos: photos }) },
    });

    revalidatePath(`/dashboard/clients/${clientId}`);
    return { success: true };
  } catch (err) {
    console.error("[removeClientPhoto]", err);
    return { success: false, error: "Failed to remove photo" };
  }
}
