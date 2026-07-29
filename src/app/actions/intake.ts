"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IntakeField {
  id: string;
  label: string;
  type: "text" | "longtext" | "number" | "date" | "boolean" | "choice" | "dropdown";
  placeholder?: string;
  required: boolean;
  options?: string[];
  isDefault?: boolean;
  order: number;
}

// ─── Default fields ───────────────────────────────────────────────────────────

const DEFAULT_INTAKE_FIELDS: IntakeField[] = [
  {
    id: "__default_name",
    label: "Full Name",
    type: "text",
    placeholder: "Your full name",
    required: true,
    isDefault: true,
    order: 0,
  },
  {
    id: "__default_phone",
    label: "Phone Number",
    type: "text",
    placeholder: "Your phone number",
    required: true,
    isDefault: true,
    order: 1,
  },
  {
    id: "__default_email",
    label: "Email Address",
    type: "text",
    placeholder: "your@email.com",
    required: false,
    isDefault: true,
    order: 2,
  },
  {
    id: "__default_birthday",
    label: "Birthday",
    type: "date",
    required: false,
    isDefault: true,
    order: 3,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loadBusinessHoursBlob(): Promise<Record<string, unknown>> {
  const salon = await prisma.salon.findFirst({ select: { businessHours: true } });
  if (!salon?.businessHours) return {};
  try {
    const parsed = JSON.parse(salon.businessHours) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    if (Array.isArray(parsed)) return { __hours: parsed };
  } catch {
    // ignore
  }
  return {};
}

// ─── Get intake form fields ───────────────────────────────────────────────────

export async function getIntakeFormFields(): Promise<IntakeField[]> {
  const blob = await loadBusinessHoursBlob();
  const custom = Array.isArray(blob.__intakeFormFields)
    ? (blob.__intakeFormFields as IntakeField[])
    : [];

  // Merge defaults with custom (defaults always first)
  return [...DEFAULT_INTAKE_FIELDS, ...custom].sort((a, b) => a.order - b.order);
}

// ─── Save intake form fields ──────────────────────────────────────────────────

export async function saveIntakeFormFields(
  fields: IntakeField[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

    // Only persist non-default fields
    const customFields = fields.filter((f) => !f.isDefault);

    const existing = await loadBusinessHoursBlob();
    const merged = { ...existing, __intakeFormFields: customFields };

    await prisma.salon.update({
      where: { id: salon.id },
      data: { updatedAt: new Date(), businessHours: JSON.stringify(merged) },
    });

    return { success: true };
  } catch (err) {
    console.error("[saveIntakeFormFields]", err);
    return { success: false, error: "Failed to save intake form fields" };
  }
}

// ─── Save client intake response ─────────────────────────────────────────────

export async function saveClientIntakeResponse(
  clientId: string,
  responses: Record<string, string | boolean | number>
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { preferences: true },
    });
    if (!client) return { success: false, error: "Client not found" };

    let existing: Record<string, unknown> = {};
    try {
      existing = JSON.parse(client.preferences ?? "{}") as Record<string, unknown>;
    } catch {
      // ignore
    }

    const merged = { ...existing, ...responses };

    await prisma.client.update({
      where: { id: clientId },
      data: { preferences: JSON.stringify(merged) },
    });

    return { success: true };
  } catch (err) {
    console.error("[saveClientIntakeResponse]", err);
    return { success: false, error: "Failed to save responses" };
  }
}

// ─── Submit intake form (public) ──────────────────────────────────────────────

export async function submitIntakeForm(
  salonSlug: string,
  data: Record<string, unknown>
): Promise<{ success: boolean; clientId?: string; isNew?: boolean; error?: string }> {
  try {
    const salon = await prisma.salon.findFirst({ where: { slug: salonSlug } });
    if (!salon) return { success: false, error: "Salon not found" };

    const phone = typeof data["__default_phone"] === "string" ? data["__default_phone"].trim() : null;
    const name = typeof data["__default_name"] === "string" ? data["__default_name"].trim() : "Guest";
    const email = typeof data["__default_email"] === "string" ? data["__default_email"].trim() : null;
    const birthday = typeof data["__default_birthday"] === "string" ? data["__default_birthday"].trim() : null;

    // Build preferences from custom field responses (exclude default field keys)
    const customResponses: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data)) {
      if (!key.startsWith("__default_")) {
        customResponses[key] = val;
      }
    }

    // Find existing client by phone (primary identifier)
    let client = phone
      ? await prisma.client.findFirst({
          where: { salonId: salon.id, phone },
          select: { id: true, preferences: true },
        })
      : null;

    if (client) {
      // Update existing client preferences
      let existing: Record<string, unknown> = {};
      try {
        existing = JSON.parse((client as { preferences?: string | null }).preferences ?? "{}") as Record<string, unknown>;
      } catch {
        // ignore
      }
      const merged = { ...existing, ...customResponses };
      await prisma.client.update({
        where: { id: client.id },
        data: {
          preferences: JSON.stringify(merged),
          ...(email && { email }),
          ...(birthday && { birthday: new Date(birthday) }),
        },
      });
      return { success: true, clientId: client.id, isNew: false };
    } else {
      // Create new client
      const id = randomUUID();
      await prisma.client.create({
        data: {
          id,
          salonId: salon.id,
          name,
          phone: phone || null,
          email: email || null,
          birthday: birthday ? new Date(birthday) : null,
          preferences: JSON.stringify(customResponses),
        },
      });
      return { success: true, clientId: id, isNew: true };
    }
  } catch (err) {
    console.error("[submitIntakeForm]", err);
    return { success: false, error: "Failed to submit form" };
  }
}
