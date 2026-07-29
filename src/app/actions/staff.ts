"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

// ─── createStaff ───────────────────────────────────────────────────────────────

const createStaffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  commissionPct: z.number().min(0).max(100).default(0),
});

export async function createStaff(
  data: { name: string; phone?: string; commissionPct?: number }
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const parsed = createStaffSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

    const staff = await prisma.staff.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
        name: parsed.data.name,
        phone: parsed.data.phone ?? null,
        commissionPct: parsed.data.commissionPct,
      },
    });

    return { success: true, id: staff.id };
  } catch (err) {
    console.error("[createStaff]", err);
    return { success: false, error: "Failed to create staff member" };
  }
}

// ─── updateStaff ───────────────────────────────────────────────────────────────

const updateStaffSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  phone: z.string().optional().nullable(),
  commissionPct: z.number().min(0).max(100).optional(),
});

export async function updateStaff(
  id: string,
  data: { name?: string; phone?: string | null; commissionPct?: number }
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = updateStaffSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await prisma.staff.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.phone !== undefined && { phone: parsed.data.phone }),
        ...(parsed.data.commissionPct !== undefined && { commissionPct: parsed.data.commissionPct }),
      },
    });

    return { success: true };
  } catch (err) {
    console.error("[updateStaff]", err);
    return { success: false, error: "Failed to update staff member" };
  }
}

// ─── deleteStaff ───────────────────────────────────────────────────────────────

export async function deleteStaff(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    // Remove junction records first to avoid FK constraint errors
    await prisma.staffService.deleteMany({ where: { staffId: id } });
    await prisma.shift.deleteMany({ where: { staffId: id } });
    await prisma.staff.delete({ where: { id } });

    return { success: true };
  } catch (err) {
    console.error("[deleteStaff]", err);
    return { success: false, error: "Failed to delete staff member" };
  }
}

// ─── setStaffShifts ────────────────────────────────────────────────────────────

const shiftSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
});

export async function setStaffShifts(
  staffId: string,
  shifts: { dayOfWeek: number; startTime: string; endTime: string }[]
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = z.array(shiftSchema).safeParse(shifts);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid shift data" };
  }

  try {
    await prisma.shift.deleteMany({ where: { staffId } });

    if (parsed.data.length > 0) {
      await prisma.shift.createMany({
        data: parsed.data.map((s) => ({
          id: randomUUID(),
          staffId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      });
    }

    return { success: true };
  } catch (err) {
    console.error("[setStaffShifts]", err);
    return { success: false, error: "Failed to update shifts" };
  }
}

// ─── setStaffServices ──────────────────────────────────────────────────────────

export async function setStaffServices(
  staffId: string,
  serviceIds: string[]
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await prisma.staffService.deleteMany({ where: { staffId } });

    if (serviceIds.length > 0) {
      await prisma.staffService.createMany({
        data: serviceIds.map((serviceId) => ({ staffId, serviceId })),
      });
    }

    return { success: true };
  } catch (err) {
    console.error("[setStaffServices]", err);
    return { success: false, error: "Failed to update services" };
  }
}

// ─── addStaffService ───────────────────────────────────────────────────────────

export async function addStaffService(
  staffId: string,
  serviceId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await prisma.staffService.create({
      data: { staffId, serviceId },
    });
    return { success: true };
  } catch (err: unknown) {
    // Unique constraint violation — already assigned, treat as success
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return { success: true };
    }
    console.error("[addStaffService]", err);
    return { success: false, error: "Failed to add service" };
  }
}

// ─── removeStaffService ────────────────────────────────────────────────────────

export async function removeStaffService(
  staffId: string,
  serviceId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await prisma.staffService.delete({
      where: { staffId_serviceId: { staffId, serviceId } },
    });
    return { success: true };
  } catch (err: unknown) {
    // Record not found — already removed, treat as success
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2025"
    ) {
      return { success: true };
    }
    console.error("[removeStaffService]", err);
    return { success: false, error: "Failed to remove service" };
  }
}
