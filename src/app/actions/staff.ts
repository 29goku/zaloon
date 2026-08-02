"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentSalonId } from "@/lib/repositories/base";

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
    const salonId = await getCurrentSalonId();

    const staff = await prisma.staff.create({
      data: {
        id: randomUUID(),
        salonId,
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

// ─── updateStaffAvatar ─────────────────────────────────────────────────────────

export async function updateStaffAvatar(
  id: string,
  photoBase64: string | null
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    // Read existing avatar JSON to preserve color/role
    const staff = await prisma.staff.findUnique({ where: { id }, select: { avatar: true } });
    let existing: Record<string, unknown> = {};
    try { existing = JSON.parse(staff?.avatar ?? "{}"); } catch {}
    const updated = { ...existing, photo: photoBase64 };
    await prisma.staff.update({ where: { id }, data: { avatar: JSON.stringify(updated) } });
    return { success: true };
  } catch (err) {
    console.error("[updateStaffAvatar]", err);
    return { success: false, error: "Failed to update avatar" };
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

// ─── createStaffMember (full onboarding wizard) ────────────────────────────────
//
// The Staff schema has no `role` or `notes` field.
// We pack { color, role } into the `avatar` JSON string so both are persisted
// without a schema migration.

const createStaffMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  role: z.string().optional(),
  commissionPct: z.number().min(0).max(100),
  avatarColor: z.string().optional(),
  photo: z.string().optional().nullable(),
  schedule: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string().min(1),
      endTime: z.string().min(1),
    })
  ),
  services: z.array(
    z.object({
      serviceId: z.string().min(1),
      commissionOverridePct: z.number().min(0).max(100).optional(),
    })
  ),
});

export async function createStaffMember(data: {
  name: string;
  phone?: string;
  role?: string;
  commissionPct: number;
  avatarColor?: string;
  photo?: string | null;
  schedule: { dayOfWeek: number; startTime: string; endTime: string }[];
  services: { serviceId: string; commissionOverridePct?: number }[];
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const parsed = createStaffMemberSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const salonId = await getCurrentSalonId();

    const { name, phone, role, commissionPct, avatarColor, photo, schedule, services } = parsed.data;

    // Pack role + color + photo into the avatar JSON field
    const avatarJson = JSON.stringify({
      color: avatarColor ?? "violet",
      role: role ?? "",
      ...(photo ? { photo } : {}),
    });

    const staffId = randomUUID();

    await prisma.staff.create({
      data: {
        id: staffId,
        salonId,
        name,
        phone: phone ?? null,
        commissionPct,
        avatar: avatarJson,
      },
    });

    if (schedule.length > 0) {
      await prisma.shift.createMany({
        data: schedule.map((s) => ({
          id: randomUUID(),
          staffId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      });
    }

    if (services.length > 0) {
      await prisma.staffService.createMany({
        data: services.map((s) => ({
          staffId,
          serviceId: s.serviceId,
          commissionOverridePct: s.commissionOverridePct ?? null,
        })),
      });
    }

    return { success: true, id: staffId };
  } catch (err) {
    console.error("[createStaffMember]", err);
    return { success: false, error: "Failed to create staff member" };
  }
}
