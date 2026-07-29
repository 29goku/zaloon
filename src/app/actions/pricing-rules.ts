"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PricingRule {
  id: string;
  name: string;
  type: "peak" | "offpeak" | "lastminute" | "advance" | "day_of_week" | "seasonal";

  // Conditions
  daysOfWeek?: number[]; // 0=Sun, 1=Mon ... 6=Sat
  timeRangeStart?: string; // HH:MM
  timeRangeEnd?: string; // HH:MM
  advanceDays?: number;
  lastMinuteHours?: number;
  dateRangeStart?: string; // YYYY-MM-DD
  dateRangeEnd?: string; // YYYY-MM-DD

  // Adjustment
  adjustmentType: "percent" | "fixed";
  adjustmentValue: number; // positive = surcharge, negative = discount

  // Target
  appliesTo: "all" | string[]; // "all" or list of service IDs

  active: boolean;
  priority: number; // higher = applied first
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getSalon() {
  return prisma.salon.findFirst();
}

async function readRules(): Promise<PricingRule[]> {
  const salon = await getSalon();
  if (!salon?.businessHours) return [];
  try {
    const parsed = JSON.parse(salon.businessHours);
    return (parsed?.__pricingRules as PricingRule[]) ?? [];
  } catch {
    return [];
  }
}

async function writeRules(rules: PricingRule[]): Promise<void> {
  const salon = await getSalon();
  if (!salon) return;
  let existing: Record<string, unknown> = {};
  try {
    if (salon.businessHours) {
      existing = JSON.parse(salon.businessHours);
    }
  } catch {
    // ignore parse errors
  }
  const updated = { ...existing, __pricingRules: rules };
  await prisma.salon.update({
    where: { id: salon.id },
    data: {
      businessHours: JSON.stringify(updated),
      updatedAt: new Date(),
    },
  });
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function getPricingRules(): Promise<PricingRule[]> {
  return readRules();
}

export async function savePricingRule(
  rule: Omit<PricingRule, "id"> & { id?: string }
): Promise<{ success: boolean; id?: string }> {
  try {
    const rules = await readRules();
    const id = rule.id ?? randomUUID();
    const idx = rules.findIndex((r) => r.id === id);
    const newRule: PricingRule = { ...rule, id };
    if (idx >= 0) {
      rules[idx] = newRule;
    } else {
      rules.push(newRule);
    }
    // Sort by priority descending
    rules.sort((a, b) => b.priority - a.priority);
    await writeRules(rules);
    return { success: true, id };
  } catch (err) {
    console.error("[savePricingRule]", err);
    return { success: false };
  }
}

export async function deletePricingRule(id: string): Promise<{ success: boolean }> {
  try {
    const rules = await readRules();
    await writeRules(rules.filter((r) => r.id !== id));
    return { success: true };
  } catch (err) {
    console.error("[deletePricingRule]", err);
    return { success: false };
  }
}

export async function togglePricingRule(
  id: string,
  active: boolean
): Promise<{ success: boolean }> {
  try {
    const rules = await readRules();
    const updated = rules.map((r) => (r.id === id ? { ...r, active } : r));
    await writeRules(updated);
    return { success: true };
  } catch (err) {
    console.error("[togglePricingRule]", err);
    return { success: false };
  }
}

// ── Calculate dynamic price ───────────────────────────────────────────────────

export async function calculateDynamicPrice(
  serviceId: string,
  date: string, // YYYY-MM-DD
  time: string // HH:MM
): Promise<{
  basePrice: number;
  finalPrice: number;
  appliedRules: { name: string; adjustment: number }[];
}> {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { price: true },
  });

  const basePrice = service?.price ?? 0;
  const rules = await readRules();

  const activeRules = rules.filter((r) => r.active);
  // Rules are already sorted by priority desc
  const appliedRules: { name: string; adjustment: number }[] = [];

  const [year, month, day] = date.split("-").map(Number);
  const bookingDate = new Date(year, month - 1, day);
  const dayOfWeek = bookingDate.getDay(); // 0=Sun

  const [timeH, timeM] = time.split(":").map(Number);
  const timeMinutes = timeH * 60 + timeM;

  // How many hours until the appointment (from now)
  const now = new Date();
  const appointmentMs = new Date(`${date}T${time}:00`).getTime();
  const hoursUntil = (appointmentMs - now.getTime()) / (1000 * 60 * 60);
  // Days until the appointment
  const daysUntil = hoursUntil / 24;

  let totalAdjustment = 0;

  for (const rule of activeRules) {
    // Check if applies to this service
    if (rule.appliesTo !== "all" && !rule.appliesTo.includes(serviceId)) continue;

    let conditionMet = false;

    switch (rule.type) {
      case "peak":
      case "offpeak": {
        // Day of week + time range
        const dayMatch =
          !rule.daysOfWeek || rule.daysOfWeek.length === 0 || rule.daysOfWeek.includes(dayOfWeek);
        let timeMatch = true;
        if (rule.timeRangeStart && rule.timeRangeEnd) {
          const [sh, sm] = rule.timeRangeStart.split(":").map(Number);
          const [eh, em] = rule.timeRangeEnd.split(":").map(Number);
          const startMin = sh * 60 + sm;
          const endMin = eh * 60 + em;
          timeMatch = timeMinutes >= startMin && timeMinutes <= endMin;
        }
        conditionMet = dayMatch && timeMatch;
        break;
      }
      case "day_of_week": {
        conditionMet =
          !!rule.daysOfWeek && rule.daysOfWeek.length > 0 && rule.daysOfWeek.includes(dayOfWeek);
        break;
      }
      case "lastminute": {
        const hrs = rule.lastMinuteHours ?? 24;
        conditionMet = hoursUntil >= 0 && hoursUntil <= hrs;
        break;
      }
      case "advance": {
        const days = rule.advanceDays ?? 7;
        conditionMet = daysUntil >= days;
        break;
      }
      case "seasonal": {
        if (rule.dateRangeStart && rule.dateRangeEnd) {
          conditionMet = date >= rule.dateRangeStart && date <= rule.dateRangeEnd;
        }
        break;
      }
    }

    if (!conditionMet) continue;

    let adjustment = 0;
    if (rule.adjustmentType === "percent") {
      adjustment = (basePrice * rule.adjustmentValue) / 100;
    } else {
      adjustment = rule.adjustmentValue;
    }

    totalAdjustment += adjustment;
    appliedRules.push({ name: rule.name, adjustment });
  }

  const finalPrice = Math.max(0, basePrice + totalAdjustment);
  return { basePrice, finalPrice, appliedRules };
}
