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

// ─── Revenue Goals ────────────────────────────────────────────────────────

export interface RevenueGoals {
  weekly: number;
  monthly: number;
  annual: number;
}

const DEFAULT_REVENUE_GOALS: RevenueGoals = {
  weekly: 0,
  monthly: 0,
  annual: 0,
};

export async function getRevenueGoals(): Promise<RevenueGoals> {
  const salon = await prisma.salon.findFirst({ select: { businessHours: true } });
  if (!salon?.businessHours) return DEFAULT_REVENUE_GOALS;
  try {
    const parsed = JSON.parse(salon.businessHours);
    if (parsed && parsed.__revenueGoals) {
      return { ...DEFAULT_REVENUE_GOALS, ...parsed.__revenueGoals };
    }
  } catch {
    // ignore
  }
  return DEFAULT_REVENUE_GOALS;
}

export async function saveRevenueGoals(
  goals: RevenueGoals
): Promise<{ success: boolean; error?: string }> {
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

    const merged = { ...existing, __revenueGoals: goals };

    await prisma.salon.update({
      where: { id: salon.id },
      data: {
        updatedAt: new Date(),
        businessHours: JSON.stringify(merged),
      },
    });

    return { success: true };
  } catch (err) {
    console.error("[saveRevenueGoals]", err);
    return { success: false, error: "Failed to save revenue goals" };
  }
}

// ─── Revenue Goals aliases (for components that import updateRevenueGoals) ───

export async function updateRevenueGoals(goals: {
  daily?: number;
  weekly?: number;
  monthly?: number;
  annual?: number;
}): Promise<{ success: boolean; error?: string }> {
  const current = await getRevenueGoals();
  return saveRevenueGoals({
    weekly: goals.weekly ?? current.weekly,
    monthly: goals.monthly ?? current.monthly,
    annual: goals.annual ?? current.annual,
  });
}

// ─── Business Hours (dedicated read/write) ───────────────────────────────────

export interface BusinessHourEntry {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface SpecialHoursEntry {
  date: string;       // YYYY-MM-DD
  description: string;
  closed: boolean;
  openTime?: string;
  closeTime?: string;
}

export interface BusinessHoursConfig {
  weeklyHours: BusinessHourEntry[];
  specialHours: SpecialHoursEntry[];
}

const DEFAULT_WEEKLY_HOURS: BusinessHourEntry[] = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
].map((day) => ({
  day,
  isOpen: day !== "Sunday",
  openTime: "09:00",
  closeTime: "19:00",
}));

const DEFAULT_BUSINESS_HOURS_CONFIG: BusinessHoursConfig = {
  weeklyHours: DEFAULT_WEEKLY_HOURS,
  specialHours: [],
};

export async function getBusinessHours(): Promise<BusinessHoursConfig> {
  const salon = await prisma.salon.findFirst({ select: { businessHours: true } });
  if (!salon?.businessHours) return DEFAULT_BUSINESS_HOURS_CONFIG;
  try {
    const parsed = JSON.parse(salon.businessHours);
    // Support legacy plain array format
    if (Array.isArray(parsed) && parsed.length === 7) {
      return { weeklyHours: parsed as BusinessHourEntry[], specialHours: [] };
    }
    if (parsed && parsed.__businessHours) {
      return { ...DEFAULT_BUSINESS_HOURS_CONFIG, ...parsed.__businessHours };
    }
    if (parsed && parsed.__hours && Array.isArray(parsed.__hours)) {
      return { weeklyHours: parsed.__hours as BusinessHourEntry[], specialHours: [] };
    }
  } catch {
    // ignore
  }
  return DEFAULT_BUSINESS_HOURS_CONFIG;
}

export async function saveBusinessHours(
  config: BusinessHoursConfig
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

    const merged = { ...existing, __businessHours: config };

    await prisma.salon.update({
      where: { id: salon.id },
      data: { updatedAt: new Date(), businessHours: JSON.stringify(merged) },
    });

    return { success: true };
  } catch (err) {
    console.error("[saveBusinessHours]", err);
    return { success: false, error: "Failed to save business hours" };
  }
}

// ─── User / Team Management ───────────────────────────────────────────────────

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  role: z.enum(["OWNER", "MANAGER", "RECEPTIONIST", "VIEWER"]).default("RECEPTIONIST"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export async function createUser(
  data: CreateUserInput
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const parsed = createUserSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

    const id = randomUUID();
    await prisma.user.create({
      data: {
        id,
        salonId: salon.id,
        name: parsed.data.name,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        role: parsed.data.role,
      },
    });

    return { success: true, id };
  } catch (err) {
    console.error("[createUser]", err);
    return { success: false, error: "Failed to create user" };
  }
}

export async function updateUserRole(
  userId: string,
  role: "OWNER" | "MANAGER" | "RECEPTIONIST" | "VIEWER"
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });
    return { success: true };
  } catch (err) {
    console.error("[updateUserRole]", err);
    return { success: false, error: "Failed to update role" };
  }
}

export async function deleteUser(
  userId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await prisma.user.delete({ where: { id: userId } });
    return { success: true };
  } catch (err) {
    console.error("[deleteUser]", err);
    return { success: false, error: "Failed to remove user" };
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

// ─── Shared helper ────────────────────────────────────────────────────────────

async function loadBusinessHoursBlob(): Promise<Record<string, unknown>> {
  const salon = await prisma.salon.findFirst({ select: { businessHours: true } });
  if (!salon?.businessHours) return {};
  try {
    const parsed = JSON.parse(salon.businessHours);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    if (Array.isArray(parsed)) return { __hours: parsed };
  } catch { /* ignore */ }
  return {};
}

async function saveBusinessHoursKey(key: string, value: unknown): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };
    const existing = await loadBusinessHoursBlob();
    const merged = { ...existing, [key]: value };
    await prisma.salon.update({ where: { id: salon.id }, data: { updatedAt: new Date(), businessHours: JSON.stringify(merged) } });
    return { success: true };
  } catch (err) {
    console.error(`[saveBusinessHoursKey:${key}]`, err);
    return { success: false, error: "Failed to save settings" };
  }
}

// ─── Blackout Dates ───────────────────────────────────────────────────────────

export interface BlackoutDate {
  id: string;
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD (same as start for single day)
  reason?: string;
  recurring?: boolean; // repeat every year on same dates
}

export async function getBlackoutDates(): Promise<BlackoutDate[]> {
  const blob = await loadBusinessHoursBlob();
  if (Array.isArray(blob.__blackoutDates)) return blob.__blackoutDates as BlackoutDate[];
  return [];
}

export async function addBlackoutDate(
  data: Omit<BlackoutDate, "id">
): Promise<{ success: boolean; error?: string }> {
  const blob = await loadBusinessHoursBlob();
  const current = Array.isArray(blob.__blackoutDates) ? (blob.__blackoutDates as BlackoutDate[]) : [];
  const next: BlackoutDate = { id: randomUUID(), ...data };
  return saveBusinessHoursKey("__blackoutDates", [...current, next]);
}

export async function removeBlackoutDate(id: string): Promise<{ success: boolean; error?: string }> {
  const blob = await loadBusinessHoursBlob();
  const current = Array.isArray(blob.__blackoutDates) ? (blob.__blackoutDates as BlackoutDate[]) : [];
  return saveBusinessHoursKey("__blackoutDates", current.filter((b) => b.id !== id));
}

// ─── Service Booking Settings ─────────────────────────────────────────────────

export interface ServiceBookingSetting {
  onlineBookingEnabled: boolean;
  maxAdvanceDays?: number;
  requiredGapDays?: number;
  bookingNote?: string;
  depositRequired?: boolean;
  depositAmount?: number;
}

export async function getServiceBookingSettings(): Promise<Record<string, ServiceBookingSetting>> {
  const blob = await loadBusinessHoursBlob();
  if (blob.__serviceBookingSettings && typeof blob.__serviceBookingSettings === "object" && !Array.isArray(blob.__serviceBookingSettings)) {
    return blob.__serviceBookingSettings as Record<string, ServiceBookingSetting>;
  }
  return {};
}

export async function saveServiceBookingSettings(
  settings: Record<string, ServiceBookingSetting>
): Promise<{ success: boolean; error?: string }> {
  return saveBusinessHoursKey("__serviceBookingSettings", settings);
}

// ─── Staff Booking Settings ───────────────────────────────────────────────────

export interface StaffBookingSetting {
  acceptsOnlineBookings: boolean;
  maxClientsPerDay?: number;
  advanceBookingDays?: number;
}

export async function getStaffBookingSettings(): Promise<Record<string, StaffBookingSetting>> {
  const blob = await loadBusinessHoursBlob();
  if (blob.__staffBookingSettings && typeof blob.__staffBookingSettings === "object" && !Array.isArray(blob.__staffBookingSettings)) {
    return blob.__staffBookingSettings as Record<string, StaffBookingSetting>;
  }
  return {};
}

export async function saveStaffBookingSettings(
  settings: Record<string, StaffBookingSetting>
): Promise<{ success: boolean; error?: string }> {
  return saveBusinessHoursKey("__staffBookingSettings", settings);
}

// ─── Confirmation Templates ───────────────────────────────────────────────────

export interface ConfirmationTemplate {
  smsBody?: string;
  emailSubject?: string;
  emailBody?: string;
}

export interface ConfirmationTemplates {
  bookingConfirmed: ConfirmationTemplate;
  bookingCancelled: ConfirmationTemplate;
  reminder24h: ConfirmationTemplate;
  reminder2h: ConfirmationTemplate;
  followUp: ConfirmationTemplate;
}

const DEFAULT_CONFIRMATION_TEMPLATES: ConfirmationTemplates = {
  bookingConfirmed: {
    smsBody: "Hi {{clientName}}, your booking at {{salonName}} on {{date}} at {{time}} with {{staffName}} is confirmed. See you soon!",
    emailSubject: "Booking Confirmed – {{salonName}}",
    emailBody: "Hi {{clientName}},\n\nYour appointment is confirmed!\n\n**Date:** {{date}}\n**Time:** {{time}}\n**Services:** {{services}}\n**Staff:** {{staffName}}\n\n{{salonName}}\n{{salonPhone}}",
  },
  bookingCancelled: {
    smsBody: "Hi {{clientName}}, your appointment at {{salonName}} on {{date}} has been cancelled. Contact us at {{salonPhone}} to rebook.",
    emailSubject: "Booking Cancelled – {{salonName}}",
    emailBody: "Hi {{clientName}},\n\nYour appointment on {{date}} at {{time}} has been cancelled.\n\nPlease contact us at {{salonPhone}} to rebook.\n\n{{salonName}}",
  },
  reminder24h: {
    smsBody: "Reminder: Hi {{clientName}}, you have an appointment at {{salonName}} tomorrow at {{time}} with {{staffName}} for {{services}}.",
    emailSubject: "Appointment Tomorrow – {{salonName}}",
    emailBody: "Hi {{clientName}},\n\nJust a reminder that your appointment is tomorrow!\n\n**Time:** {{time}}\n**Services:** {{services}}\n**Staff:** {{staffName}}\n\nSee you soon!\n{{salonName}}",
  },
  reminder2h: {
    smsBody: "Hi {{clientName}}, your appointment at {{salonName}} is in 2 hours at {{time}}. See you soon!",
    emailSubject: "Appointment in 2 Hours – {{salonName}}",
    emailBody: "Hi {{clientName}},\n\nYour appointment at {{salonName}} is coming up in 2 hours at {{time}}.\n\nSee you soon!",
  },
  followUp: {
    smsBody: "Hi {{clientName}}, thank you for visiting {{salonName}}! We hope to see you again soon. Book your next appointment at {{salonName}}.",
    emailSubject: "Thank You for Visiting – {{salonName}}",
    emailBody: "Hi {{clientName}},\n\nThank you for visiting {{salonName}}! We hope you enjoyed your services.\n\nWe'd love to see you again soon.\n\n{{salonName}}\n{{salonPhone}}",
  },
};

export async function getConfirmationTemplates(): Promise<ConfirmationTemplates> {
  const blob = await loadBusinessHoursBlob();
  if (blob.__confirmationTemplates && typeof blob.__confirmationTemplates === "object" && !Array.isArray(blob.__confirmationTemplates)) {
    return { ...DEFAULT_CONFIRMATION_TEMPLATES, ...(blob.__confirmationTemplates as Partial<ConfirmationTemplates>) };
  }
  return DEFAULT_CONFIRMATION_TEMPLATES;
}

export async function saveConfirmationTemplates(
  templates: ConfirmationTemplates
): Promise<{ success: boolean; error?: string }> {
  return saveBusinessHoursKey("__confirmationTemplates", templates);
}

// ─── Salon Info (branding page) ───────────────────────────────────────────────

export async function updateSalonInfo(data: {
  name?: string;
  tagline?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
  currency?: string;
  taxRate?: number;
  invoicePrefix?: string;
  invoiceFooter?: string;
  requireTaxId?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

    const { tagline, requireTaxId, ...salonFields } = data;

    await prisma.salon.update({
      where: { id: salon.id },
      data: {
        updatedAt: new Date(),
        ...(salonFields.name !== undefined && { name: salonFields.name }),
        ...(salonFields.phone !== undefined && { phone: salonFields.phone || null }),
        ...(salonFields.email !== undefined && { email: salonFields.email || null }),
        ...(salonFields.address !== undefined && { address: salonFields.address || null }),
        ...(salonFields.city !== undefined && { city: salonFields.city || null }),
        ...(salonFields.country !== undefined && { country: salonFields.country }),
        ...(salonFields.timezone !== undefined && { timezone: salonFields.timezone }),
        ...(salonFields.currency !== undefined && { currency: salonFields.currency }),
        ...(salonFields.taxRate !== undefined && { taxRate: salonFields.taxRate }),
        ...(salonFields.invoicePrefix !== undefined && { invoicePrefix: salonFields.invoicePrefix || "INV" }),
        ...(salonFields.invoiceFooter !== undefined && { invoiceFooter: salonFields.invoiceFooter || null }),
      },
    });

    // Store tagline and requireTaxId inside businessHours JSON
    if (tagline !== undefined || requireTaxId !== undefined) {
      const existing = await loadBusinessHoursBlob();
      const merged: Record<string, unknown> = { ...existing };
      if (tagline !== undefined) merged.__tagline = tagline;
      if (requireTaxId !== undefined) merged.__requireTaxId = requireTaxId;
      await prisma.salon.update({
        where: { id: salon.id },
        data: { updatedAt: new Date(), businessHours: JSON.stringify(merged) },
      });
    }

    return { success: true };
  } catch (err) {
    console.error("[updateSalonInfo]", err);
    return { success: false, error: "Failed to update salon info" };
  }
}

export async function updateSalonLogo(base64: string): Promise<{ success: boolean; error?: string }> {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };
    await prisma.salon.update({
      where: { id: salon.id },
      data: { updatedAt: new Date(), logo: base64 || null },
    });
    return { success: true };
  } catch (err) {
    console.error("[updateSalonLogo]", err);
    return { success: false, error: "Failed to update logo" };
  }
}

export async function updateBusinessHoursGrid(
  hours: Record<string, { open: boolean; openTime: string; closeTime: string }>
): Promise<{ success: boolean; error?: string }> {
  return saveBusinessHoursKey("__businessHours", hours);
}

export async function updateSocialLinks(links: {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  googleMaps?: string;
}): Promise<{ success: boolean; error?: string }> {
  return saveBusinessHoursKey("__socialLinks", links);
}

// ─── Extended Booking Rules (booking settings page) ───────────────────────────

export interface ExtendedBookingRules {
  // Booking window
  minNoticeHours: number;
  maxAdvanceDays: number;
  slotIntervalMins: number;
  // Behavior
  allowOnlineBooking: boolean;
  requirePhone: boolean;
  requireEmail: boolean;
  autoConfirm: boolean;
  maxPerSlot: number;
  // Cancellation
  allowOnlineCancellations: boolean;
  cancellationCutoffHours: number;
  cancellationFeeType: "none" | "fixed" | "percentage";
  cancellationFeeAmount: number;
  lateCancellationMessage: string;
  // Deposit
  requireDeposit: boolean;
  depositType: "fixed" | "percentage";
  depositAmount: number;
}

const DEFAULT_EXTENDED_BOOKING_RULES: ExtendedBookingRules = {
  minNoticeHours: 1,
  maxAdvanceDays: 30,
  slotIntervalMins: 30,
  allowOnlineBooking: true,
  requirePhone: true,
  requireEmail: false,
  autoConfirm: true,
  maxPerSlot: 1,
  allowOnlineCancellations: true,
  cancellationCutoffHours: 24,
  cancellationFeeType: "none",
  cancellationFeeAmount: 0,
  lateCancellationMessage: "",
  requireDeposit: false,
  depositType: "fixed",
  depositAmount: 0,
};

export async function getExtendedBookingRules(): Promise<ExtendedBookingRules> {
  const blob = await loadBusinessHoursBlob();
  if (blob.__extendedBookingRules && typeof blob.__extendedBookingRules === "object") {
    return { ...DEFAULT_EXTENDED_BOOKING_RULES, ...(blob.__extendedBookingRules as Partial<ExtendedBookingRules>) };
  }
  return DEFAULT_EXTENDED_BOOKING_RULES;
}

export async function updateBookingRules(
  rules: Partial<ExtendedBookingRules>
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await loadBusinessHoursBlob();
    const current = (existing.__extendedBookingRules as Partial<ExtendedBookingRules>) ?? {};
    return saveBusinessHoursKey("__extendedBookingRules", {
      ...DEFAULT_EXTENDED_BOOKING_RULES,
      ...current,
      ...rules,
    });
  } catch (err) {
    console.error("[updateBookingRules]", err);
    return { success: false, error: "Failed to save booking rules" };
  }
}
