"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const salonSettingsSchema = z.object({
  name: z.string().min(1, "Salon name is required").optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  taxRate: z.number().min(0).max(100).optional(),
  invoicePrefix: z.string().min(1).max(20).optional(),
  invoiceFooter: z.string().max(500).optional(),
  businessHours: z.string().optional(),
});

export type SalonSettingsInput = z.infer<typeof salonSettingsSchema>;

export async function updateSalonSettings(
  data: SalonSettingsInput
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = salonSettingsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) {
      return { success: false, error: "No salon found" };
    }

    const {
      name,
      address,
      city,
      country,
      timezone,
      currency,
      phone,
      email,
      taxRate,
      invoicePrefix,
      invoiceFooter,
      businessHours,
    } = parsed.data;

    await prisma.salon.update({
      where: { id: salon.id },
      data: {
        updatedAt: new Date(),
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address: address || null }),
        ...(city !== undefined && { city: city || null }),
        ...(country !== undefined && { country }),
        ...(timezone !== undefined && { timezone }),
        ...(currency !== undefined && { currency }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(email !== undefined && { email: email || null }),
        ...(taxRate !== undefined && { taxRate }),
        ...(invoicePrefix !== undefined && { invoicePrefix: invoicePrefix || "INV" }),
        ...(invoiceFooter !== undefined && { invoiceFooter: invoiceFooter || null }),
        ...(businessHours !== undefined && { businessHours: businessHours || null }),
      },
    });

    return { success: true };
  } catch (err) {
    console.error("[updateSalonSettings]", err);
    return { success: false, error: "Failed to update settings" };
  }
}

// ─── Loyalty Settings ──────────────────────────────────────────────────────

export interface LoyaltyTierConfig {
  name: string;
  minPoints: number;
}

export interface LoyaltySettings {
  tiers: LoyaltyTierConfig[];
  pointsPerDollar: number;
  firstVisitBonus: number;
  referralBonus: number;
  birthdayBonus: number;
  redemptionRate: number; // points needed per $1
  minimumRedeem: number;
}

const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  tiers: [
    { name: "Bronze", minPoints: 0 },
    { name: "Silver", minPoints: 500 },
    { name: "Gold", minPoints: 1500 },
    { name: "Platinum", minPoints: 3000 },
  ],
  pointsPerDollar: 1,
  firstVisitBonus: 50,
  referralBonus: 100,
  birthdayBonus: 200,
  redemptionRate: 100,
  minimumRedeem: 500,
};

export async function getLoyaltySettings(): Promise<LoyaltySettings> {
  const salon = await prisma.salon.findFirst({ select: { businessHours: true } });
  if (!salon?.businessHours) return DEFAULT_LOYALTY_SETTINGS;
  try {
    const parsed = JSON.parse(salon.businessHours);
    if (parsed && parsed.__loyalty) {
      return { ...DEFAULT_LOYALTY_SETTINGS, ...parsed.__loyalty };
    }
  } catch {
    // ignore
  }
  return DEFAULT_LOYALTY_SETTINGS;
}

const loyaltyTierSchema = z.object({
  name: z.string().min(1),
  minPoints: z.number().min(0),
});

const loyaltySettingsSchema = z.object({
  tiers: z.array(loyaltyTierSchema).length(4),
  pointsPerDollar: z.number().min(0.1).max(100),
  firstVisitBonus: z.number().min(0).max(10000),
  referralBonus: z.number().min(0).max(10000),
  birthdayBonus: z.number().min(0).max(10000),
  redemptionRate: z.number().min(1).max(10000),
  minimumRedeem: z.number().min(0).max(100000),
});

export type LoyaltySettingsInput = z.infer<typeof loyaltySettingsSchema>;

export async function saveLoyaltySettings(
  data: LoyaltySettingsInput
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = loyaltySettingsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

    // Parse existing businessHours to preserve the hours array
    let existing: Record<string, unknown> = {};
    if (salon.businessHours) {
      try {
        const prev = JSON.parse(salon.businessHours);
        if (prev && typeof prev === "object" && !Array.isArray(prev)) {
          existing = prev;
        } else if (Array.isArray(prev)) {
          // old format: plain array — store as __hours
          existing = { __hours: prev };
        }
      } catch {
        // ignore
      }
    }

    const merged = { ...existing, __loyalty: parsed.data };

    await prisma.salon.update({
      where: { id: salon.id },
      data: {
        updatedAt: new Date(),
        businessHours: JSON.stringify(merged),
      },
    });

    return { success: true };
  } catch (err) {
    console.error("[saveLoyaltySettings]", err);
    return { success: false, error: "Failed to save loyalty settings" };
  }
}

// ─── Staff Goals ──────────────────────────────────────────────────────────

export async function getStaffGoals(): Promise<Record<string, number>> {
  const salon = await prisma.salon.findFirst({ select: { businessHours: true } });
  if (!salon?.businessHours) return {};
  try {
    const parsed = JSON.parse(salon.businessHours);
    if (parsed && parsed.__staffGoals && typeof parsed.__staffGoals === "object") {
      return parsed.__staffGoals as Record<string, number>;
    }
  } catch {
    // ignore
  }
  return {};
}

export async function saveStaffGoals(
  goals: Record<string, number>
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

    let existing: Record<string, unknown> = {};
    if (salon.businessHours) {
      try {
        const prev = JSON.parse(salon.businessHours);
        if (prev && typeof prev === "object" && !Array.isArray(prev)) {
          existing = prev;
        } else if (Array.isArray(prev)) {
          existing = { __hours: prev };
        }
      } catch {
        // ignore
      }
    }

    const merged = { ...existing, __staffGoals: goals };

    await prisma.salon.update({
      where: { id: salon.id },
      data: {
        updatedAt: new Date(),
        businessHours: JSON.stringify(merged),
      },
    });

    return { success: true };
  } catch (err) {
    console.error("[saveStaffGoals]", err);
    return { success: false, error: "Failed to save staff goals" };
  }
}

// ─── Booking Rules ────────────────────────────────────────────────────────

export interface BookingRules {
  minAdvanceHours: number;
  maxAdvanceDays: number;
  allowSameDay: boolean;
  cancellationHours: number;
  requireDeposit: boolean;
  depositAmount: number;
  depositType: "fixed" | "percentage";
  bufferBetweenSlots: number;
  maxBookingsPerDay: number | null;
  allowOnlineBooking: boolean;
  showStaffSelection: boolean;
  allowGuestBooking: boolean;
  confirmationRequired: boolean;
}

const DEFAULT_BOOKING_RULES: BookingRules = {
  minAdvanceHours: 1,
  maxAdvanceDays: 90,
  allowSameDay: true,
  cancellationHours: 24,
  requireDeposit: false,
  depositAmount: 0,
  depositType: "fixed",
  bufferBetweenSlots: 0,
  maxBookingsPerDay: null,
  allowOnlineBooking: true,
  showStaffSelection: true,
  allowGuestBooking: true,
  confirmationRequired: false,
};

export async function getBookingRules(): Promise<BookingRules> {
  const salon = await prisma.salon.findFirst({ select: { businessHours: true } });
  if (!salon?.businessHours) return DEFAULT_BOOKING_RULES;
  try {
    const parsed = JSON.parse(salon.businessHours);
    if (parsed && parsed.__bookingRules) {
      return { ...DEFAULT_BOOKING_RULES, ...parsed.__bookingRules };
    }
  } catch {
    // ignore
  }
  return DEFAULT_BOOKING_RULES;
}

export async function saveBookingRules(
  rules: Partial<BookingRules>
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

    let existing: Record<string, unknown> = {};
    if (salon.businessHours) {
      try {
        const prev = JSON.parse(salon.businessHours);
        if (prev && typeof prev === "object" && !Array.isArray(prev)) {
          existing = prev;
        } else if (Array.isArray(prev)) {
          existing = { __hours: prev };
        }
      } catch {
        // ignore
      }
    }

    const currentRules = (existing.__bookingRules as Partial<BookingRules>) ?? {};
    const merged = { ...existing, __bookingRules: { ...DEFAULT_BOOKING_RULES, ...currentRules, ...rules } };

    await prisma.salon.update({
      where: { id: salon.id },
      data: { updatedAt: new Date(), businessHours: JSON.stringify(merged) },
    });

    return { success: true };
  } catch (err) {
    console.error("[saveBookingRules]", err);
    return { success: false, error: "Failed to save booking rules" };
  }
}

// ─── Staff Unavailability ─────────────────────────────────────────────────

export interface StaffUnavailability {
  staffId: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:MM, undefined = all day
  endTime?: string;
  reason?: string;
}

export async function getStaffUnavailability(staffId?: string): Promise<StaffUnavailability[]> {
  const salon = await prisma.salon.findFirst({ select: { businessHours: true } });
  if (!salon?.businessHours) return [];
  try {
    const parsed = JSON.parse(salon.businessHours);
    if (parsed && Array.isArray(parsed.__staffUnavailability)) {
      const all = parsed.__staffUnavailability as StaffUnavailability[];
      return staffId ? all.filter((u) => u.staffId === staffId) : all;
    }
  } catch {
    // ignore
  }
  return [];
}

export async function addUnavailability(
  data: StaffUnavailability
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

    let existing: Record<string, unknown> = {};
    if (salon.businessHours) {
      try {
        const prev = JSON.parse(salon.businessHours);
        if (prev && typeof prev === "object" && !Array.isArray(prev)) {
          existing = prev;
        } else if (Array.isArray(prev)) {
          existing = { __hours: prev };
        }
      } catch {
        // ignore
      }
    }

    const current = Array.isArray(existing.__staffUnavailability)
      ? (existing.__staffUnavailability as StaffUnavailability[])
      : [];

    const merged = { ...existing, __staffUnavailability: [...current, data] };

    await prisma.salon.update({
      where: { id: salon.id },
      data: { updatedAt: new Date(), businessHours: JSON.stringify(merged) },
    });

    return { success: true };
  } catch (err) {
    console.error("[addUnavailability]", err);
    return { success: false, error: "Failed to add unavailability" };
  }
}

export async function removeUnavailability(
  staffId: string,
  date: string,
  startTime?: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

    let existing: Record<string, unknown> = {};
    if (salon.businessHours) {
      try {
        const prev = JSON.parse(salon.businessHours);
        if (prev && typeof prev === "object" && !Array.isArray(prev)) {
          existing = prev;
        } else if (Array.isArray(prev)) {
          existing = { __hours: prev };
        }
      } catch {
        // ignore
      }
    }

    const current = Array.isArray(existing.__staffUnavailability)
      ? (existing.__staffUnavailability as StaffUnavailability[])
      : [];

    const filtered = current.filter((u) => {
      if (u.staffId !== staffId || u.date !== date) return true;
      // If startTime provided, match on it; else remove all-day entry
      if (startTime !== undefined) return u.startTime !== startTime;
      return u.startTime !== undefined; // keep timed entries, remove all-day
    });

    const merged = { ...existing, __staffUnavailability: filtered };

    await prisma.salon.update({
      where: { id: salon.id },
      data: { updatedAt: new Date(), businessHours: JSON.stringify(merged) },
    });

    return { success: true };
  } catch (err) {
    console.error("[removeUnavailability]", err);
    return { success: false, error: "Failed to remove unavailability" };
  }
}

// ─── Digest Settings ─────────────────────────────────────────────────────

export interface DigestSettings {
  enabled: boolean;
  frequency: "daily" | "weekly";
  weekday: number; // 0=Sun…6=Sat (weekly only)
  time: string;    // "08:00"
  recipients: string[];
  includeRevenue: boolean;
  includeAppointments: boolean;
  includeNewClients: boolean;
  includeReviews: boolean;
  includeNoShows: boolean;
  includeTopStaff: boolean;
}

const DEFAULT_DIGEST_SETTINGS: DigestSettings = {
  enabled: false,
  frequency: "weekly",
  weekday: 1, // Monday
  time: "08:00",
  recipients: [],
  includeRevenue: true,
  includeAppointments: true,
  includeNewClients: true,
  includeReviews: true,
  includeNoShows: true,
  includeTopStaff: true,
};

export async function getDigestSettings(): Promise<DigestSettings> {
  const salon = await prisma.salon.findFirst({ select: { businessHours: true } });
  if (!salon?.businessHours) return DEFAULT_DIGEST_SETTINGS;
  try {
    const parsed = JSON.parse(salon.businessHours);
    if (parsed && parsed.__digestSettings) {
      return { ...DEFAULT_DIGEST_SETTINGS, ...parsed.__digestSettings };
    }
  } catch {
    // ignore
  }
  return DEFAULT_DIGEST_SETTINGS;
}

export async function saveDigestSettings(
  data: Partial<DigestSettings>
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

    let existing: Record<string, unknown> = {};
    if (salon.businessHours) {
      try {
        const prev = JSON.parse(salon.businessHours);
        if (prev && typeof prev === "object" && !Array.isArray(prev)) {
          existing = prev;
        } else if (Array.isArray(prev)) {
          existing = { __hours: prev };
        }
      } catch {
        // ignore
      }
    }

    const current = (existing.__digestSettings as Partial<DigestSettings>) ?? {};
    const merged = { ...existing, __digestSettings: { ...DEFAULT_DIGEST_SETTINGS, ...current, ...data } };

    await prisma.salon.update({
      where: { id: salon.id },
      data: { updatedAt: new Date(), businessHours: JSON.stringify(merged) },
    });

    return { success: true };
  } catch (err) {
    console.error("[saveDigestSettings]", err);
    return { success: false, error: "Failed to save digest settings" };
  }
}

// ─── Tax Settings ─────────────────────────────────────────────────────────

export interface TaxSettings {
  enabled: boolean;
  taxName: string; // "GST", "VAT", "Sales Tax", "HST"
  taxRate: number; // percentage, e.g. 10 for 10%
  taxNumber: string; // business tax registration number
  includeTaxInPrice: boolean; // true = prices are tax-inclusive
  taxableItems: "all" | "services_only" | "products_only";
  additionalTaxes: Array<{ name: string; rate: number }>; // e.g. city tax
}

const DEFAULT_TAX_SETTINGS: TaxSettings = {
  enabled: false,
  taxName: "Tax",
  taxRate: 0,
  taxNumber: "",
  includeTaxInPrice: false,
  taxableItems: "all",
  additionalTaxes: [],
};

export async function getTaxSettings(): Promise<TaxSettings> {
  const salon = await prisma.salon.findFirst({ select: { businessHours: true } });
  if (!salon?.businessHours) return DEFAULT_TAX_SETTINGS;
  try {
    const parsed = JSON.parse(salon.businessHours);
    if (parsed && parsed.__taxSettings) {
      return { ...DEFAULT_TAX_SETTINGS, ...parsed.__taxSettings };
    }
  } catch {
    // ignore
  }
  return DEFAULT_TAX_SETTINGS;
}

export async function saveTaxSettings(
  data: Partial<TaxSettings>
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

    let existing: Record<string, unknown> = {};
    if (salon.businessHours) {
      try {
        const prev = JSON.parse(salon.businessHours);
        if (prev && typeof prev === "object" && !Array.isArray(prev)) {
          existing = prev;
        } else if (Array.isArray(prev)) {
          existing = { __hours: prev };
        }
      } catch {
        // ignore
      }
    }

    const current = (existing.__taxSettings as Partial<TaxSettings>) ?? {};
    const merged = {
      ...existing,
      __taxSettings: { ...DEFAULT_TAX_SETTINGS, ...current, ...data },
    };

    await prisma.salon.update({
      where: { id: salon.id },
      data: { updatedAt: new Date(), businessHours: JSON.stringify(merged) },
    });

    return { success: true };
  } catch (err) {
    console.error("[saveTaxSettings]", err);
    return { success: false, error: "Failed to save tax settings" };
  }
}

// ─── Reminder Settings ───────────────────────────────────────────────────────

export interface ReminderSettings {
  smsEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  hoursBefore: number[];           // e.g. [2, 24] = 2 hr and 24 hr before
  dayBeforeAt5pm: boolean;
  smsTemplate: string;
  emailSubject: string;
  emailBody: string;
  postVisitReviewEnabled: boolean;
  postVisitDelayHours: number;
  postVisitTemplate: string;
}

const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  smsEnabled: true,
  emailEnabled: false,
  whatsappEnabled: false,
  hoursBefore: [24, 2],
  dayBeforeAt5pm: false,
  smsTemplate:
    "Hi {{clientName}}, this is a reminder for your appointment at {{salonName}} on {{date}} at {{time}} with {{staffName}} for {{services}}. Reply STOP to unsubscribe.",
  emailSubject: "Appointment Reminder – {{salonName}}",
  emailBody:
    "Hi {{clientName}},\n\nJust a reminder that you have an appointment at **{{salonName}}** on **{{date}}** at **{{time}}** with **{{staffName}}**.\n\nServices: {{services}}\n\nSee you soon!\n— {{salonName}}",
  postVisitReviewEnabled: false,
  postVisitDelayHours: 4,
  postVisitTemplate:
    "Hi {{clientName}}, thank you for visiting {{salonName}}! We'd love to hear your feedback. Please leave us a review: {{reviewLink}}",
};

export async function getReminderSettings(): Promise<ReminderSettings> {
  const salon = await prisma.salon.findFirst({ select: { businessHours: true } });
  if (!salon?.businessHours) return DEFAULT_REMINDER_SETTINGS;
  try {
    const parsed = JSON.parse(salon.businessHours);
    if (parsed && parsed.__reminderSettings) {
      return { ...DEFAULT_REMINDER_SETTINGS, ...parsed.__reminderSettings };
    }
  } catch {
    // ignore
  }
  return DEFAULT_REMINDER_SETTINGS;
}

export async function saveReminderSettings(
  data: Partial<ReminderSettings>
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

    let existing: Record<string, unknown> = {};
    if (salon.businessHours) {
      try {
        const prev = JSON.parse(salon.businessHours);
        if (prev && typeof prev === "object" && !Array.isArray(prev)) {
          existing = prev;
        } else if (Array.isArray(prev)) {
          existing = { __hours: prev };
        }
      } catch {
        // ignore
      }
    }

    const current = (existing.__reminderSettings as Partial<ReminderSettings>) ?? {};
    const merged = {
      ...existing,
      __reminderSettings: { ...DEFAULT_REMINDER_SETTINGS, ...current, ...data },
    };

    await prisma.salon.update({
      where: { id: salon.id },
      data: { updatedAt: new Date(), businessHours: JSON.stringify(merged) },
    });

    return { success: true };
  } catch (err) {
    console.error("[saveReminderSettings]", err);
    return { success: false, error: "Failed to save reminder settings" };
  }
}

// ─── Add Branch ────────────────────────────────────────────────────────────

const addBranchSchema = z.object({
  name: z.string().min(1, "Branch name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  address: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
});

export type AddBranchInput = z.infer<typeof addBranchSchema>;

export async function addBranch(
  data: AddBranchInput
): Promise<{ success: true; id: string; slug: string } | { success: false; error: string }> {
  const parsed = addBranchSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, slug, address, city, phone } = parsed.data;

  // Check slug uniqueness
  const existing = await prisma.salon.findUnique({ where: { slug } });
  if (existing) {
    return { success: false, error: "A location with this slug already exists. Please choose a different name." };
  }

  try {
    const id = randomUUID();
    await prisma.salon.create({
      data: {
        id,
        name,
        slug,
        address: address || null,
        city: city || null,
        phone: phone || null,
        updatedAt: new Date(),
      },
    });

    redirect(`/dashboard/settings?branch=${id}`);
  } catch (err: unknown) {
    // redirect() throws — let it propagate
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    console.error("[addBranch]", err);
    return { success: false, error: "Failed to create branch" };
  }
}
