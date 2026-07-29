"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ServiceBreakdown {
  serviceId: string;
  serviceName: string;
  count: number;
  revenue: number;
  commissionPct: number; // effective rate (override or default)
  commission: number;
}

export interface PayrollSummaryResult {
  staffId: string;
  staffName: string;
  defaultCommissionPct: number;
  periodStart: string;
  periodEnd: string;
  appointmentCount: number;
  totalRevenue: number;
  totalCommission: number;
  services: ServiceBreakdown[];
  alreadyPaid: boolean;
  payrollRecordId: string | null;
}

export interface PayrollHistoryItem {
  id: string;
  periodStart: string;
  periodEnd: string;
  totalRevenue: number;
  commission: number;
  paidAt: string | null;
  paidBy: string | null;
  notes: string | null;
  createdAt: string;
}

// ── getPayrollSummary ─────────────────────────────────────────────────────────

/**
 * Compute per-staff revenue + commission for a date range.
 * Uses per-service override rates when set, otherwise falls back to
 * the staff's default commissionPct.
 */
export async function getPayrollSummary(
  staffId: string,
  from: string,
  to: string
): Promise<
  { success: true; data: PayrollSummaryResult } | { success: false; error: string }
> {
  try {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        StaffService: {
          select: { serviceId: true, commissionOverridePct: true },
        },
        Appointment: {
          where: {
            status: "COMPLETED",
            date: { gte: from, lte: to },
          },
          include: {
            AppointmentService: {
              include: { Service: { select: { id: true, name: true, price: true } } },
            },
            Invoice: { select: { total: true, status: true } },
          },
        },
      },
    });

    if (!staff) return { success: false, error: "Staff not found" };

    // Build commission override map: serviceId -> override %
    const overrideMap = new Map<string, number | null>();
    for (const ss of staff.StaffService) {
      overrideMap.set(ss.serviceId, ss.commissionOverridePct ?? null);
    }

    // Per-service accumulator
    const serviceMap = new Map<
      string,
      {
        serviceName: string;
        count: number;
        revenue: number;
        commissionPct: number;
      }
    >();

    let totalRevenue = 0;

    for (const appt of staff.Appointment) {
      // Determine appointment revenue (invoice if PAID, else totalAmount)
      const inv = appt.Invoice;
      const apptRevenue =
        inv && inv.status === "PAID" ? inv.total : appt.totalAmount;

      // Split revenue equally across services in this appointment
      const serviceCount = appt.AppointmentService.length;
      if (serviceCount === 0) {
        // No services linked — count against a virtual "Other" bucket
        const key = "__no_service__";
        const existing = serviceMap.get(key);
        const rate =
          staff.commissionPct; // default rate
        if (existing) {
          existing.count++;
          existing.revenue += apptRevenue;
        } else {
          serviceMap.set(key, {
            serviceName: "Other",
            count: 1,
            revenue: apptRevenue,
            commissionPct: rate,
          });
        }
        totalRevenue += apptRevenue;
        continue;
      }

      const revenuePerService = apptRevenue / serviceCount;
      for (const as of appt.AppointmentService) {
        const sid = as.serviceId;
        const override = overrideMap.get(sid);
        const effectiveRate =
          override !== undefined && override !== null
            ? override
            : staff.commissionPct;

        const existing = serviceMap.get(sid);
        if (existing) {
          existing.count++;
          existing.revenue += revenuePerService;
        } else {
          serviceMap.set(sid, {
            serviceName: as.Service.name,
            count: 1,
            revenue: revenuePerService,
            commissionPct: effectiveRate,
          });
        }
      }
      totalRevenue += apptRevenue;
    }

    // Build breakdown array
    const services: ServiceBreakdown[] = Array.from(serviceMap.entries()).map(
      ([serviceId, data]) => ({
        serviceId,
        serviceName: data.serviceName,
        count: data.count,
        revenue: data.revenue,
        commissionPct: data.commissionPct,
        commission: (data.revenue * data.commissionPct) / 100,
      })
    );
    services.sort((a, b) => b.revenue - a.revenue);

    const totalCommission = services.reduce((s, x) => s + x.commission, 0);

    // Check if already paid
    const existingRecord = await prisma.payrollRecord.findFirst({
      where: {
        staffId,
        periodStart: new Date(from),
        periodEnd: new Date(to),
      },
      select: { id: true, paidAt: true },
    });

    return {
      success: true,
      data: {
        staffId: staff.id,
        staffName: staff.name,
        defaultCommissionPct: staff.commissionPct,
        periodStart: from,
        periodEnd: to,
        appointmentCount: staff.Appointment.length,
        totalRevenue,
        totalCommission,
        services,
        alreadyPaid: existingRecord !== null,
        payrollRecordId: existingRecord?.id ?? null,
      },
    };
  } catch (err) {
    console.error("[getPayrollSummary]", err);
    return { success: false, error: "Failed to compute payroll summary" };
  }
}

// ── markPeriodPaid ────────────────────────────────────────────────────────────

/**
 * Creates a PayrollRecord to mark a period as paid.
 */
export async function markPeriodPaid(
  staffId: string,
  from: string,
  to: string,
  amount: number,
  paidBy?: string,
  notes?: string
): Promise<
  { success: true; id: string } | { success: false; error: string }
> {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) return { success: false, error: "Staff not found" };

    // Compute totalRevenue for this period
    const appointments = await prisma.appointment.findMany({
      where: {
        staffId,
        status: "COMPLETED",
        date: { gte: from, lte: to },
      },
      include: { Invoice: { select: { total: true, status: true } } },
    });

    const totalRevenue = appointments.reduce((sum, appt) => {
      const inv = appt.Invoice;
      return sum + (inv && inv.status === "PAID" ? inv.total : appt.totalAmount);
    }, 0);

    const record = await prisma.payrollRecord.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
        staffId,
        periodStart: new Date(from),
        periodEnd: new Date(to),
        totalRevenue,
        commission: amount,
        paidAt: new Date(),
        paidBy: paidBy ?? null,
        notes: notes ?? null,
      },
    });

    return { success: true, id: record.id };
  } catch (err) {
    console.error("[markPeriodPaid]", err);
    return { success: false, error: "Failed to mark period as paid" };
  }
}

// ── getPayrollHistory ─────────────────────────────────────────────────────────

/**
 * List past pay periods for a staff member, ordered newest first.
 */
export async function getPayrollHistory(
  staffId: string
): Promise<
  { success: true; data: PayrollHistoryItem[] } | { success: false; error: string }
> {
  try {
    const records = await prisma.payrollRecord.findMany({
      where: { staffId },
      orderBy: { periodStart: "desc" },
    });

    const data: PayrollHistoryItem[] = records.map((r) => ({
      id: r.id,
      periodStart: r.periodStart.toISOString().split("T")[0],
      periodEnd: r.periodEnd.toISOString().split("T")[0],
      totalRevenue: r.totalRevenue,
      commission: r.commission,
      paidAt: r.paidAt ? r.paidAt.toISOString() : null,
      paidBy: r.paidBy,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
    }));

    return { success: true, data };
  } catch (err) {
    console.error("[getPayrollHistory]", err);
    return { success: false, error: "Failed to fetch payroll history" };
  }
}

// ── setServiceCommissionOverride ──────────────────────────────────────────────

/**
 * Set or clear per-service commission override for a staff member.
 * Pass null to remove the override and revert to the staff default.
 */
export async function setServiceCommissionOverride(
  staffId: string,
  serviceId: string,
  overridePct: number | null
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    if (overridePct !== null && (overridePct < 0 || overridePct > 100)) {
      return { success: false, error: "Override must be between 0 and 100" };
    }

    // Upsert the StaffService row (ensure the assignment exists)
    await prisma.staffService.upsert({
      where: { staffId_serviceId: { staffId, serviceId } },
      create: { staffId, serviceId, commissionOverridePct: overridePct },
      update: { commissionOverridePct: overridePct },
    });

    return { success: true };
  } catch (err) {
    console.error("[setServiceCommissionOverride]", err);
    return { success: false, error: "Failed to update commission override" };
  }
}

// ── createPayrollPayment ──────────────────────────────────────────────────────

/**
 * Create a PayrollRecord payment for a staff member.
 */
export async function createPayrollPayment(data: {
  staffId: string;
  periodStart: string;
  periodEnd: string;
  totalRevenue: number;
  commission: number;
  paidBy?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

    const staff = await prisma.staff.findUnique({ where: { id: data.staffId } });
    if (!staff) return { success: false, error: "Staff not found" };

    await prisma.payrollRecord.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
        staffId: data.staffId,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        totalRevenue: data.totalRevenue,
        commission: data.commission,
        paidAt: new Date(),
        paidBy: data.paidBy ?? null,
        notes: data.notes ?? null,
      },
    });

    return { success: true };
  } catch (err) {
    console.error("[createPayrollPayment]", err);
    return { success: false, error: "Failed to create payroll payment" };
  }
}

// ── getAllPayrollHistory ───────────────────────────────────────────────────────

/**
 * List all PayrollRecord entries across all staff, ordered newest first.
 */
export async function getAllPayrollHistory(filters?: {
  staffId?: string;
  from?: string;
  to?: string;
}): Promise<
  | {
      success: true;
      data: Array<{
        id: string;
        staffId: string;
        staffName: string;
        periodStart: string;
        periodEnd: string;
        totalRevenue: number;
        commission: number;
        paidAt: string | null;
        paidBy: string | null;
        notes: string | null;
        createdAt: string;
      }>;
    }
  | { success: false; error: string }
> {
  try {
    const where: Record<string, unknown> = {};
    if (filters?.staffId) where.staffId = filters.staffId;
    if (filters?.from || filters?.to) {
      where.periodStart = {};
      if (filters.from)
        (where.periodStart as Record<string, unknown>).gte = new Date(filters.from);
      if (filters.to)
        (where.periodStart as Record<string, unknown>).lte = new Date(filters.to);
    }

    const records = await prisma.payrollRecord.findMany({
      where,
      orderBy: { periodStart: "desc" },
      include: { Staff: { select: { name: true } } },
    });

    return {
      success: true,
      data: records.map((r) => ({
        id: r.id,
        staffId: r.staffId,
        staffName: r.Staff.name,
        periodStart: r.periodStart.toISOString().split("T")[0],
        periodEnd: r.periodEnd.toISOString().split("T")[0],
        totalRevenue: r.totalRevenue,
        commission: r.commission,
        paidAt: r.paidAt ? r.paidAt.toISOString() : null,
        paidBy: r.paidBy,
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  } catch (err) {
    console.error("[getAllPayrollHistory]", err);
    return { success: false, error: "Failed to fetch payroll history" };
  }
}

// ── getPayrollForPeriod ───────────────────────────────────────────────────────

export interface PayrollPeriodSummary {
  staffId: string;
  staffName: string;
  commissionPct: number;
  servicesCount: number;
  totalRevenue: number;
  commissionEarned: number;
  tips: number;
  netPay: number;
  status: "PAID" | "PENDING";
  recordId?: string;
}

/**
 * Aggregate invoices/tips for each staff member in the given date range.
 * Links through Appointment -> Staff -> Invoice.
 */
export async function getPayrollForPeriod(
  startDate: Date,
  endDate: Date
): Promise<PayrollPeriodSummary[]> {
  const from = startDate.toISOString().split("T")[0];
  const to = endDate.toISOString().split("T")[0];

  const staff = await prisma.staff.findMany({
    orderBy: { name: "asc" },
    include: {
      StaffService: { select: { serviceId: true, commissionOverridePct: true } },
      Appointment: {
        where: { status: "COMPLETED", date: { gte: from, lte: to } },
        include: {
          Invoice: { select: { total: true, status: true, tip: true } },
          AppointmentService: { select: { serviceId: true } },
        },
      },
      PayrollRecord: {
        where: {
          periodStart: startDate,
          periodEnd: endDate,
        },
        select: { id: true, paidAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return staff.map((member) => {
    const overrideMap = new Map<string, number | null>();
    for (const ss of member.StaffService) {
      overrideMap.set(ss.serviceId, ss.commissionOverridePct ?? null);
    }

    let totalRevenue = 0;
    let totalCommission = 0;
    let totalTips = 0;
    let servicesCount = 0;

    for (const appt of member.Appointment) {
      const inv = appt.Invoice;
      const apptRevenue =
        inv && inv.status === "PAID" ? inv.total : appt.totalAmount;
      const apptTip = inv?.tip ?? 0;
      totalTips += apptTip;

      const svcCount = appt.AppointmentService.length;
      servicesCount += svcCount || 1;

      if (svcCount === 0) {
        totalRevenue += apptRevenue;
        totalCommission += (apptRevenue * member.commissionPct) / 100;
        continue;
      }

      const revenuePerSvc = apptRevenue / svcCount;
      for (const as of appt.AppointmentService) {
        const override = overrideMap.get(as.serviceId);
        const rate =
          override !== undefined && override !== null
            ? override
            : member.commissionPct;
        totalRevenue += revenuePerSvc;
        totalCommission += (revenuePerSvc * rate) / 100;
      }
    }

    const paidRecord = member.PayrollRecord[0] ?? null;

    return {
      staffId: member.id,
      staffName: member.name,
      commissionPct: member.commissionPct,
      servicesCount,
      totalRevenue,
      commissionEarned: totalCommission,
      tips: totalTips,
      netPay: totalCommission + totalTips,
      status: (paidRecord !== null ? "PAID" : "PENDING") as "PAID" | "PENDING",
      recordId: paidRecord?.id,
    };
  });
}

// ── markStaffPaid ─────────────────────────────────────────────────────────────

/**
 * Creates or updates a PayrollRecord to mark a staff member as paid for a period.
 */
export async function markStaffPaid(data: {
  staffId: string;
  periodStart: Date;
  periodEnd: Date;
  totalRevenue: number;
  commission: number;
  paidBy?: string;
  notes?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

    const staff = await prisma.staff.findUnique({ where: { id: data.staffId } });
    if (!staff) return { success: false, error: "Staff not found" };

    // Upsert: update if already exists for this exact period, else create
    const existing = await prisma.payrollRecord.findFirst({
      where: {
        staffId: data.staffId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
      },
    });

    let record;
    if (existing) {
      record = await prisma.payrollRecord.update({
        where: { id: existing.id },
        data: {
          totalRevenue: data.totalRevenue,
          commission: data.commission,
          paidAt: new Date(),
          paidBy: data.paidBy ?? null,
          notes: data.notes ?? null,
        },
      });
    } else {
      record = await prisma.payrollRecord.create({
        data: {
          id: randomUUID(),
          salonId: salon.id,
          staffId: data.staffId,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
          totalRevenue: data.totalRevenue,
          commission: data.commission,
          paidAt: new Date(),
          paidBy: data.paidBy ?? null,
          notes: data.notes ?? null,
        },
      });
    }

    return { success: true, id: record.id };
  } catch (err) {
    console.error("[markStaffPaid]", err);
    return { success: false, error: "Failed to mark staff as paid" };
  }
}

// ── getPayrollHistoryAll ──────────────────────────────────────────────────────

/**
 * List PayrollRecord entries, optionally filtered by staffId, newest first.
 */
export async function getPayrollHistoryAll(staffId?: string): Promise<{
  records: Array<{
    id: string;
    staffId: string;
    staffName: string;
    periodStart: Date;
    periodEnd: Date;
    totalRevenue: number;
    commission: number;
    paidAt: Date | null;
    notes: string | null;
  }>;
}> {
  const records = await prisma.payrollRecord.findMany({
    where: staffId ? { staffId } : undefined,
    orderBy: { periodStart: "desc" },
    include: { Staff: { select: { name: true } } },
  });

  return {
    records: records.map((r) => ({
      id: r.id,
      staffId: r.staffId,
      staffName: r.Staff.name,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      totalRevenue: r.totalRevenue,
      commission: r.commission,
      paidAt: r.paidAt,
      notes: r.notes,
    })),
  };
}

// ── bulkMarkPaid ──────────────────────────────────────────────────────────────

/**
 * Mark multiple staff members as paid for the same period.
 */
export async function bulkMarkPaid(
  staffIds: string[],
  period: { start: Date; end: Date }
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, count: 0, error: "No salon found" };

    const from = period.start.toISOString().split("T")[0];
    const to = period.end.toISOString().split("T")[0];

    let count = 0;
    for (const staffId of staffIds) {
      // Get revenue for this staff member in period
      const appointments = await prisma.appointment.findMany({
        where: { staffId, status: "COMPLETED", date: { gte: from, lte: to } },
        include: { Invoice: { select: { total: true, status: true } } },
      });

      const totalRevenue = appointments.reduce((sum, appt) => {
        const inv = appt.Invoice;
        return sum + (inv && inv.status === "PAID" ? inv.total : appt.totalAmount);
      }, 0);

      const staff = await prisma.staff.findUnique({ where: { id: staffId } });
      if (!staff) continue;

      const commission = (totalRevenue * staff.commissionPct) / 100;

      const existing = await prisma.payrollRecord.findFirst({
        where: {
          staffId,
          periodStart: period.start,
          periodEnd: period.end,
        },
      });

      if (existing) {
        await prisma.payrollRecord.update({
          where: { id: existing.id },
          data: { totalRevenue, commission, paidAt: new Date() },
        });
      } else {
        await prisma.payrollRecord.create({
          data: {
            id: randomUUID(),
            salonId: salon.id,
            staffId,
            periodStart: period.start,
            periodEnd: period.end,
            totalRevenue,
            commission,
            paidAt: new Date(),
          },
        });
      }
      count++;
    }

    return { success: true, count };
  } catch (err) {
    console.error("[bulkMarkPaid]", err);
    return { success: false, count: 0, error: "Failed to bulk mark paid" };
  }
}

// ── bulkSetServiceCommissionOverrides ─────────────────────────────────────────

/**
 * Batch update commission overrides for all assigned services of a staff member.
 */
export async function bulkSetServiceCommissionOverrides(
  staffId: string,
  overrides: { serviceId: string; overridePct: number | null }[]
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    for (const { serviceId, overridePct } of overrides) {
      if (overridePct !== null && (overridePct < 0 || overridePct > 100)) {
        return {
          success: false,
          error: `Override for service ${serviceId} must be between 0 and 100`,
        };
      }
    }

    await Promise.all(
      overrides.map(({ serviceId, overridePct }) =>
        prisma.staffService.upsert({
          where: { staffId_serviceId: { staffId, serviceId } },
          create: { staffId, serviceId, commissionOverridePct: overridePct },
          update: { commissionOverridePct: overridePct },
        })
      )
    );

    return { success: true };
  } catch (err) {
    console.error("[bulkSetServiceCommissionOverrides]", err);
    return { success: false, error: "Failed to update commission overrides" };
  }
}
