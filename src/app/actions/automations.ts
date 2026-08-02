"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentSalonId } from "@/lib/repositories/base";
import { revalidatePath } from "next/cache";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AutomationRuleData = {
  name: string;
  trigger: string;
  channel: string;
  timing: string;
  messageTemplate: string;
  isActive?: boolean;
};

export type AutomationRule = {
  id: string;
  salonId: string;
  name: string;
  trigger: string;
  channel: string;
  timing: string;
  messageTemplate: string;
  isActive: boolean;
  createdAt: Date;
};


// ── Helper ────────────────────────────────────────────────────────────────────

async function getDefaultSalonId(): Promise<string | null> {
  try {
    return await getCurrentSalonId();
  } catch {
    return null;
  }
}

// ── createRule ────────────────────────────────────────────────────────────────

export async function createRule(
  data: AutomationRuleData
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  if (!data.name?.trim()) return { success: false, error: "Name is required" };
  if (!data.trigger) return { success: false, error: "Trigger is required" };
  if (!data.channel) return { success: false, error: "Channel is required" };
  if (!data.timing) return { success: false, error: "Timing is required" };
  if (!data.messageTemplate?.trim()) return { success: false, error: "Message template is required" };

  try {
    const salonId = await getDefaultSalonId();
    if (!salonId) return { success: false, error: "No salon found" };

    const rule = await prisma.automationRule.create({
      data: {
        id: randomUUID(),
        salonId,
        name: data.name.trim(),
        trigger: data.trigger,
        channel: data.channel,
        timing: data.timing,
        messageTemplate: data.messageTemplate.trim(),
        isActive: data.isActive ?? true,
      },
    });

    revalidatePath("/dashboard/settings/automations");
    return { success: true, id: rule.id };
  } catch (err) {
    console.error("[createRule]", err);
    return { success: false, error: "Failed to create automation rule" };
  }
}

// ── updateRule ────────────────────────────────────────────────────────────────

export async function updateRule(
  id: string,
  data: Partial<AutomationRuleData>
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Missing rule ID" };

  try {
    const existing = await prisma.automationRule.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Rule not found" };

    await prisma.automationRule.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.trigger !== undefined ? { trigger: data.trigger } : {}),
        ...(data.channel !== undefined ? { channel: data.channel } : {}),
        ...(data.timing !== undefined ? { timing: data.timing } : {}),
        ...(data.messageTemplate !== undefined ? { messageTemplate: data.messageTemplate.trim() } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    revalidatePath("/dashboard/settings/automations");
    return { success: true };
  } catch (err) {
    console.error("[updateRule]", err);
    return { success: false, error: "Failed to update automation rule" };
  }
}

// ── deleteRule ────────────────────────────────────────────────────────────────

export async function deleteRule(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Missing rule ID" };

  try {
    const existing = await prisma.automationRule.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Rule not found" };

    await prisma.automationRule.delete({ where: { id } });

    revalidatePath("/dashboard/settings/automations");
    return { success: true };
  } catch (err) {
    console.error("[deleteRule]", err);
    return { success: false, error: "Failed to delete automation rule" };
  }
}

// ── toggleRule ────────────────────────────────────────────────────────────────

export async function toggleRule(
  id: string
): Promise<{ success: true; isActive: boolean } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Missing rule ID" };

  try {
    const existing = await prisma.automationRule.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Rule not found" };

    const updated = await prisma.automationRule.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    revalidatePath("/dashboard/settings/automations");
    return { success: true, isActive: updated.isActive };
  } catch (err) {
    console.error("[toggleRule]", err);
    return { success: false, error: "Failed to toggle automation rule" };
  }
}

// ── getRules ──────────────────────────────────────────────────────────────────

export async function getRules(): Promise<AutomationRule[]> {
  try {
    const salonId = await getDefaultSalonId();
    if (!salonId) return [];

    return prisma.automationRule.findMany({
      where: { salonId },
      orderBy: { createdAt: "asc" },
    });
  } catch (err) {
    console.error("[getRules]", err);
    return [];
  }
}

// ── processAutomations ────────────────────────────────────────────────────────
// Finds matching active rules for the given trigger and creates Reminder records.
// Called from appointment hooks (simulated only — no actual sending).

export async function processAutomations(
  trigger: string,
  appointmentId: string
): Promise<{ success: true; created: number } | { success: false; error: string }> {
  if (!trigger) return { success: false, error: "Trigger is required" };
  if (!appointmentId) return { success: false, error: "appointmentId is required" };

  try {
    const salonId = await getDefaultSalonId();
    if (!salonId) return { success: false, error: "No salon found" };

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        Client: { select: { id: true, name: true } },
        AppointmentService: {
          include: { Service: { select: { name: true } } },
        },
        Staff: { select: { name: true } },
        Salon: { select: { name: true } },
      },
    });

    if (!appointment) return { success: false, error: "Appointment not found" };

    const rules = await prisma.automationRule.findMany({
      where: { salonId, trigger, isActive: true },
    });

    if (rules.length === 0) return { success: true, created: 0 };

    const clientName = appointment.Client?.name ?? "Valued Customer";
    const serviceName =
      appointment.AppointmentService?.[0]?.Service?.name ?? "your service";
    const staffName = appointment.Staff?.name ?? "your stylist";
    const salonName = appointment.Salon?.name ?? "our salon";

    const timingOffsets: Record<string, number> = {
      immediate: 0,
      "1h_before": -60,
      "24h_before": -24 * 60,
      "48h_before": -48 * 60,
      "1h_after": 60,
      "24h_after": 24 * 60,
      "7d_after": 7 * 24 * 60,
      "30d_after": 30 * 24 * 60,
    };

    const [year, month, day] = appointment.date.split("-").map(Number);
    const [hour, minute] = appointment.startTime.split(":").map(Number);
    const apptDateTime = new Date(year, month - 1, day, hour, minute);

    let created = 0;

    for (const rule of rules) {
      const offsetMins = timingOffsets[rule.timing] ?? 0;
      const scheduledAt = new Date(apptDateTime.getTime() + offsetMins * 60 * 1000);

      const message = rule.messageTemplate
        .replace(/{client_name}/g, clientName)
        .replace(/{appointment_date}/g, appointment.date)
        .replace(/{appointment_time}/g, appointment.startTime)
        .replace(/{service_name}/g, serviceName)
        .replace(/{staff_name}/g, staffName)
        .replace(/{salon_name}/g, salonName);

      await prisma.reminder.create({
        data: {
          id: randomUUID(),
          salonId,
          appointmentId,
          clientId: appointment.clientId ?? null,
          type: rule.channel,
          status: "PENDING",
          message,
          scheduledAt,
        },
      });
      created++;
    }

    revalidatePath("/dashboard/reminders");
    return { success: true, created };
  } catch (err) {
    console.error("[processAutomations]", err);
    return { success: false, error: "Failed to process automations" };
  }
}
