"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentSalonId } from "@/lib/repositories/base";

// ── addTip ────────────────────────────────────────────────────────────────────

export async function addTip(
  invoiceId: string,
  tipAmount: number
): Promise<{ success: true } | { success: false; error: string }> {
  if (!invoiceId) return { success: false, error: "invoiceId is required" };
  if (isNaN(tipAmount) || tipAmount < 0)
    return { success: false, error: "Invalid tip amount" };

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { InvoiceItem: true },
    });
    if (!invoice) return { success: false, error: "Invoice not found" };
    if (invoice.status === "VOID")
      return { success: false, error: "Cannot add tip to a voided invoice" };

    // subtotal = sum of items (before discount)
    const subtotal = invoice.InvoiceItem.reduce(
      (s, item) => s + item.price * item.qty,
      0
    );
    const newTotal = subtotal - invoice.discount + tipAmount;

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        tip: tipAmount,
        total: Math.max(0, newTotal),
      },
    });

    revalidatePath(`/dashboard/invoices/${invoiceId}`);
    revalidatePath("/dashboard/invoices");
    revalidatePath("/dashboard/finance/tips");
    return { success: true };
  } catch (err) {
    console.error("[addTip]", err);
    return { success: false, error: "Failed to add tip" };
  }
}

// ── getTipsForStaff ───────────────────────────────────────────────────────────

export async function getTipsForStaff(
  staffId: string,
  from: Date,
  to: Date
): Promise<{
  total: number;
  average: number;
  count: number;
  tips: Array<{
    invoiceId: string;
    amount: number;
    date: string;
    clientName: string;
  }>;
}> {
  const salonId = await getCurrentSalonId();
  const invoices = await prisma.invoice.findMany({
    where: {
      salonId,
      tip: { gt: 0 },
      createdAt: { gte: from, lte: to },
      Appointment: { staffId },
    },
    include: {
      Client: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const tips = invoices.map((inv) => ({
    invoiceId: inv.id,
    amount: inv.tip,
    date: inv.createdAt.toISOString().split("T")[0],
    clientName: inv.Client?.name ?? "Walk-in",
  }));

  const total = tips.reduce((s, t) => s + t.amount, 0);
  const count = tips.length;
  const average = count > 0 ? total / count : 0;

  return { total, average, count, tips };
}

// ── getTipSummary ─────────────────────────────────────────────────────────────

export async function getTipSummary(
  from: Date,
  to: Date
): Promise<
  Array<{
    staffId: string;
    staffName: string;
    totalTips: number;
    avgTip: number;
    tipCount: number;
    tipsAsPercentOfRevenue: number;
  }>
> {
  const salonId = await getCurrentSalonId();
  // Get all invoices with tips in range that have an appointment
  const invoices = await prisma.invoice.findMany({
    where: {
      salonId,
      tip: { gt: 0 },
      createdAt: { gte: from, lte: to },
      Appointment: { isNot: null },
    },
    include: {
      Appointment: { include: { Staff: true } },
    },
  });

  // Get all invoices in range that have an appointment (for revenue per staff)
  const allInvoices = await prisma.invoice.findMany({
    where: {
      salonId,
      createdAt: { gte: from, lte: to },
      status: "PAID",
      Appointment: { isNot: null },
    },
    include: {
      Appointment: { select: { staffId: true, Staff: { select: { name: true } } } },
    },
  });

  // Build revenue map per staff
  const revenueByStaff: Record<string, number> = {};
  for (const inv of allInvoices) {
    const sid = inv.Appointment?.staffId;
    if (!sid) continue;
    revenueByStaff[sid] = (revenueByStaff[sid] ?? 0) + inv.total;
  }

  // Aggregate tips per staff
  const tipsByStaff: Record<
    string,
    { name: string; total: number; count: number }
  > = {};

  for (const inv of invoices) {
    const appt = inv.Appointment;
    if (!appt) continue;
    const sid = appt.staffId;
    const existing = tipsByStaff[sid];
    if (!existing) {
      tipsByStaff[sid] = {
        name: appt.Staff.name,
        total: inv.tip,
        count: 1,
      };
    } else {
      existing.total += inv.tip;
      existing.count += 1;
    }
  }

  return Object.entries(tipsByStaff).map(([staffId, data]) => {
    const revenue = revenueByStaff[staffId] ?? 0;
    return {
      staffId,
      staffName: data.name,
      totalTips: data.total,
      avgTip: data.count > 0 ? data.total / data.count : 0,
      tipCount: data.count,
      tipsAsPercentOfRevenue: revenue > 0 ? (data.total / revenue) * 100 : 0,
    };
  });
}

// ── getRecentTips ─────────────────────────────────────────────────────────────

export async function getRecentTips(limit = 20): Promise<
  Array<{
    invoiceId: string;
    date: string;
    clientName: string;
    staffName: string;
    serviceName: string;
    tipAmount: number;
    invoiceTotal: number;
  }>
> {
  const salonId = await getCurrentSalonId();
  const invoices = await prisma.invoice.findMany({
    where: { salonId, tip: { gt: 0 } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      Client: { select: { name: true } },
      Appointment: {
        include: {
          Staff: { select: { name: true } },
          AppointmentService: { include: { Service: { select: { name: true } } } },
        },
      },
    },
  });

  return invoices.map((inv) => ({
    invoiceId: inv.id,
    date: inv.createdAt.toISOString().split("T")[0],
    clientName: inv.Client?.name ?? "Walk-in",
    staffName: inv.Appointment?.Staff?.name ?? "—",
    serviceName:
      inv.Appointment?.AppointmentService?.[0]?.Service?.name ?? "Quick Pay",
    tipAmount: inv.tip,
    invoiceTotal: inv.total,
  }));
}

// ── getTipStats ───────────────────────────────────────────────────────────────
// Returns header card data for the tips dashboard

export async function getTipStats(from: Date, to: Date) {
  const salonId = await getCurrentSalonId();
  const [tippedInvoices, totalInvoicesInRange] = await Promise.all([
    prisma.invoice.findMany({
      where: { salonId, tip: { gt: 0 }, createdAt: { gte: from, lte: to } },
      select: { tip: true },
    }),
    prisma.invoice.count({
      where: { salonId, createdAt: { gte: from, lte: to }, status: "PAID" },
    }),
  ]);

  const totalTips = tippedInvoices.reduce((s, inv) => s + inv.tip, 0);
  const tipCount = tippedInvoices.length;
  const avgTip = tipCount > 0 ? totalTips / tipCount : 0;
  const tipRate =
    totalInvoicesInRange > 0
      ? Math.round((tipCount / totalInvoicesInRange) * 100)
      : 0;

  return { totalTips, avgTip, tipCount, tipRate };
}
