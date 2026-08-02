"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getCurrentSalonId } from "@/lib/repositories/base";
import { readSalonBlob, writeSalonBlobKey } from "@/lib/repositories/salon";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MessageTemplate {
  id: string;
  name: string;
  category:
    | "appointment"
    | "reminder"
    | "birthday"
    | "winback"
    | "promotion"
    | "followup"
    | "custom";
  channel: "SMS" | "WhatsApp" | "Email";
  subject?: string;
  body: string;
  variables: string[];
  isDefault: boolean;
  isActive: boolean;
  usageCount: number;
  lastUsedAt?: string;
}

// ── Default templates seeded on first load ───────────────────────────────────

const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: "default-appt-reminder",
    name: "Appointment Reminder",
    category: "appointment",
    channel: "WhatsApp",
    body: "Hi {{clientName}}! Reminder: your appointment is tomorrow {{date}} at {{time}} at {{salonName}}. Reply STOP to cancel.",
    variables: ["clientName", "date", "time", "salonName"],
    isDefault: true,
    isActive: true,
    usageCount: 0,
  },
  {
    id: "default-24h-reminder",
    name: "24h Before Reminder",
    category: "reminder",
    channel: "WhatsApp",
    body: "Hi {{clientName}}, see you tomorrow at {{time}} for {{service}}! 💈 — {{salonName}}",
    variables: ["clientName", "time", "service", "salonName"],
    isDefault: true,
    isActive: true,
    usageCount: 0,
  },
  {
    id: "default-2h-reminder",
    name: "2h Before Reminder",
    category: "reminder",
    channel: "WhatsApp",
    body: "{{clientName}}, your appointment starts in 2 hours at {{time}}. See you soon! — {{salonName}}",
    variables: ["clientName", "time", "salonName"],
    isDefault: true,
    isActive: true,
    usageCount: 0,
  },
  {
    id: "default-birthday",
    name: "Birthday Greeting",
    category: "birthday",
    channel: "WhatsApp",
    body: "🎂 Happy Birthday {{clientName}}! Enjoy 15% off your next visit. Book: {{bookingLink}} — {{salonName}}",
    variables: ["clientName", "bookingLink", "salonName"],
    isDefault: true,
    isActive: true,
    usageCount: 0,
  },
  {
    id: "default-winback",
    name: "Win-back Message",
    category: "winback",
    channel: "WhatsApp",
    body: "Hi {{clientName}}, we miss you! It's been a while since your last visit. Book now: {{bookingLink}} — {{salonName}}",
    variables: ["clientName", "bookingLink", "salonName"],
    isDefault: true,
    isActive: true,
    usageCount: 0,
  },
  {
    id: "default-followup",
    name: "Post-Visit Follow-up",
    category: "followup",
    channel: "WhatsApp",
    body: "Thank you for visiting {{salonName}}, {{clientName}}! Hope you loved your {{service}}. Leave us a review: {{reviewLink}}",
    variables: ["salonName", "clientName", "service", "reviewLink"],
    isDefault: true,
    isActive: true,
    usageCount: 0,
  },
  {
    id: "default-booking-confirmation",
    name: "Booking Confirmation",
    category: "appointment",
    channel: "WhatsApp",
    body: "Confirmed! {{clientName}}, your appointment on {{date}} at {{time}} for {{service}} is booked. See you soon! — {{salonName}}",
    variables: ["clientName", "date", "time", "service", "salonName"],
    isDefault: true,
    isActive: true,
    usageCount: 0,
  },
  {
    id: "default-no-show",
    name: "No-show Follow-up",
    category: "appointment",
    channel: "WhatsApp",
    body: "Hi {{clientName}}, we missed you today! To rebook: {{bookingLink}} — {{salonName}}",
    variables: ["clientName", "bookingLink", "salonName"],
    isDefault: true,
    isActive: true,
    usageCount: 0,
  },
];

// ── Internal helpers ──────────────────────────────────────────────────────────

async function getTemplatesBlob(): Promise<MessageTemplate[]> {
  const salonId = await getCurrentSalonId();
  const blob = await readSalonBlob(salonId);
  const templates = blob.__messageTemplates as MessageTemplate[] | undefined;
  if (!templates || templates.length === 0) return [...DEFAULT_TEMPLATES];
  return templates;
}

async function saveTemplatesBlob(templates: MessageTemplate[]): Promise<void> {
  const salonId = await getCurrentSalonId();
  await writeSalonBlobKey(salonId, "__messageTemplates", templates);
}

// ── Public actions ─────────────────────────────────────────────────────────────

export async function getTemplates(
  category?: string,
  channel?: string
): Promise<MessageTemplate[]> {
  let templates = await getTemplatesBlob();

  if (category && category !== "all") {
    templates = templates.filter((t) => t.category === category);
  }
  if (channel && channel !== "all") {
    templates = templates.filter((t) => t.channel === channel);
  }

  return templates;
}

export async function createTemplate(
  data: Omit<MessageTemplate, "id" | "isDefault" | "usageCount">
): Promise<{ success: boolean; template?: MessageTemplate }> {
  try {
    const templates = await getTemplatesBlob();

    const newTemplate: MessageTemplate = {
      ...data,
      id: randomUUID(),
      isDefault: false,
      usageCount: 0,
    };

    templates.push(newTemplate);
    await saveTemplatesBlob(templates);
    revalidatePath("/dashboard/settings/templates");
    return { success: true, template: newTemplate };
  } catch (err) {
    console.error("[createTemplate]", err);
    return { success: false };
  }
}

export async function updateTemplate(
  id: string,
  data: Partial<MessageTemplate>
): Promise<{ success: boolean; error?: string }> {
  try {
    const templates = await getTemplatesBlob();
    const idx = templates.findIndex((t) => t.id === id);
    if (idx === -1) return { success: false, error: "Template not found" };

    templates[idx] = { ...templates[idx], ...data, id };
    await saveTemplatesBlob(templates);
    revalidatePath("/dashboard/settings/templates");
    return { success: true };
  } catch (err) {
    console.error("[updateTemplate]", err);
    return { success: false, error: "Failed to update template" };
  }
}

export async function deleteTemplate(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const templates = await getTemplatesBlob();
    const template = templates.find((t) => t.id === id);
    if (!template) return { success: false, error: "Template not found" };
    if (template.isDefault) {
      return { success: false, error: "Cannot delete a default template" };
    }

    const updated = templates.filter((t) => t.id !== id);
    await saveTemplatesBlob(updated);
    revalidatePath("/dashboard/settings/templates");
    return { success: true };
  } catch (err) {
    console.error("[deleteTemplate]", err);
    return { success: false, error: "Failed to delete template" };
  }
}

export async function resolveTemplate(
  templateId: string,
  vars: Record<string, string>
): Promise<{ body: string; subject?: string }> {
  const templates = await getTemplatesBlob();
  const template = templates.find((t) => t.id === templateId);
  if (!template) return { body: "" };

  function replace(text: string): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  }

  return {
    body: replace(template.body),
    subject: template.subject ? replace(template.subject) : undefined,
  };
}

export async function trackTemplateUsage(templateId: string): Promise<void> {
  try {
    const templates = await getTemplatesBlob();
    const idx = templates.findIndex((t) => t.id === templateId);
    if (idx === -1) return;

    templates[idx] = {
      ...templates[idx],
      usageCount: (templates[idx].usageCount ?? 0) + 1,
      lastUsedAt: new Date().toISOString(),
    };

    await saveTemplatesBlob(templates);
  } catch (err) {
    console.error("[trackTemplateUsage]", err);
  }
}
