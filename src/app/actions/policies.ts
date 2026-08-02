"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentSalonId } from "@/lib/repositories/base";
import { readSalonBlob, writeSalonBlobKey } from "@/lib/repositories/salon";

// ─── Policy interfaces ─────────────────────────────────────────────────────────

export interface CancellationPolicy {
  enabled: boolean;
  noticePeriodHours: number;
  lateFeeType: "fixed" | "percent";
  lateFeeValue: number;
  noShowFeeEnabled: boolean;
  noShowFeeType: "fixed" | "percent";
  noShowFeeValue: number;
  autoChargeFee: boolean;
  policyText: string;
}

export interface DepositPolicy {
  enabled: boolean;
  requireForNew: boolean;
  requireForAll: boolean;
  depositType: "fixed" | "percent";
  depositValue: number;
  refundOnCancel: boolean;
  policyText: string;
}

const DEFAULT_CANCELLATION_POLICY: CancellationPolicy = {
  enabled: false,
  noticePeriodHours: 24,
  lateFeeType: "fixed",
  lateFeeValue: 25,
  noShowFeeEnabled: false,
  noShowFeeType: "fixed",
  noShowFeeValue: 50,
  autoChargeFee: false,
  policyText:
    "Cancellations within 24 hours of appointment time are subject to a $25 fee.",
};

const DEFAULT_DEPOSIT_POLICY: DepositPolicy = {
  enabled: false,
  requireForNew: false,
  requireForAll: false,
  depositType: "fixed",
  depositValue: 50,
  refundOnCancel: true,
  policyText: "We require a $50 deposit to secure your booking.",
};

// ─── Cancellation policy ───────────────────────────────────────────────────────

export async function getCancellationPolicy(): Promise<CancellationPolicy> {
  try {
    const salonId = await getCurrentSalonId();
    const blob = await readSalonBlob(salonId);
    const stored = blob.__cancellationPolicy as CancellationPolicy | undefined;
    if (!stored) return { ...DEFAULT_CANCELLATION_POLICY };
    return { ...DEFAULT_CANCELLATION_POLICY, ...stored };
  } catch {
    return { ...DEFAULT_CANCELLATION_POLICY };
  }
}

export async function saveCancellationPolicy(
  policy: CancellationPolicy
): Promise<{ success: boolean; error?: string }> {
  try {
    const salonId = await getCurrentSalonId();
    await writeSalonBlobKey(salonId, "__cancellationPolicy", policy);
    revalidatePath("/dashboard/settings/cancellation-policy");
    return { success: true };
  } catch (err) {
    console.error("[saveCancellationPolicy]", err);
    return { success: false, error: "Failed to save cancellation policy" };
  }
}

// ─── Deposit policy ────────────────────────────────────────────────────────────

export async function getDepositPolicy(): Promise<DepositPolicy> {
  try {
    const salonId = await getCurrentSalonId();
    const blob = await readSalonBlob(salonId);
    const stored = blob.__depositPolicy as DepositPolicy | undefined;
    if (!stored) return { ...DEFAULT_DEPOSIT_POLICY };
    return { ...DEFAULT_DEPOSIT_POLICY, ...stored };
  } catch {
    return { ...DEFAULT_DEPOSIT_POLICY };
  }
}

export async function saveDepositPolicy(
  policy: DepositPolicy
): Promise<{ success: boolean; error?: string }> {
  try {
    const salonId = await getCurrentSalonId();
    await writeSalonBlobKey(salonId, "__depositPolicy", policy);
    revalidatePath("/dashboard/settings/deposit-policy");
    return { success: true };
  } catch (err) {
    console.error("[saveDepositPolicy]", err);
    return { success: false, error: "Failed to save deposit policy" };
  }
}

// ─── Apply cancellation fee ────────────────────────────────────────────────────

export async function applyCancellationFee(
  appointmentId: string,
  feeType: "late_cancel" | "no_show"
): Promise<{ success: boolean; feeAmount?: number; invoiceId?: string; error?: string }> {
  if (!appointmentId) return { success: false, error: "Missing appointment id" };

  try {
    const policy = await getCancellationPolicy();
    if (!policy.enabled) {
      return { success: false, error: "Cancellation policy is not enabled" };
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        AppointmentService: {
          include: { Service: { select: { price: true } } },
        },
      },
    });
    if (!appointment) return { success: false, error: "Appointment not found" };

    const salonId = await getCurrentSalonId();

    const serviceTotal = appointment.AppointmentService.reduce(
      (sum, as) => sum + as.Service.price,
      0
    );
    const baseAmount = serviceTotal > 0 ? serviceTotal : appointment.totalAmount;

    let feeAmount = 0;
    if (feeType === "late_cancel") {
      feeAmount =
        policy.lateFeeType === "percent"
          ? Math.round((baseAmount * policy.lateFeeValue) / 100 * 100) / 100
          : policy.lateFeeValue;
    } else {
      if (!policy.noShowFeeEnabled) {
        return { success: false, error: "No-show fee is not enabled" };
      }
      feeAmount =
        policy.noShowFeeType === "percent"
          ? Math.round((baseAmount * policy.noShowFeeValue) / 100 * 100) / 100
          : policy.noShowFeeValue;
    }

    if (feeAmount <= 0) {
      return { success: false, error: "Fee amount is 0 — nothing to charge" };
    }

    const feeLabel = feeType === "late_cancel" ? "Late Cancellation Fee" : "No-Show Fee";

    const invoice = await prisma.invoice.create({
      data: {
        id: randomUUID(),
        salonId,
        clientId: appointment.clientId ?? null,
        appointmentId: appointment.id,
        total: feeAmount,
        paymentMethod: "CARD",
        status: "PENDING",
        note: `${feeLabel} for appointment on ${appointment.date} at ${appointment.startTime}`,
        InvoiceItem: {
          create: {
            id: randomUUID(),
            name: feeLabel,
            price: feeAmount,
            qty: 1,
          },
        },
      },
    });

    revalidatePath("/dashboard/invoices");
    revalidatePath("/dashboard/appointments");
    return { success: true, feeAmount, invoiceId: invoice.id };
  } catch (err) {
    console.error("[applyCancellationFee]", err);
    return { success: false, error: "Failed to apply cancellation fee" };
  }
}

// ─── Collect deposit ───────────────────────────────────────────────────────────

export async function collectDeposit(
  appointmentId: string,
  amount: number,
  paymentMethod: string
): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  if (!appointmentId) return { success: false, error: "Missing appointment id" };
  if (!amount || amount <= 0) return { success: false, error: "Invalid amount" };

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, clientId: true, salonId: true, date: true, startTime: true, notes: true },
    });
    if (!appointment) return { success: false, error: "Appointment not found" };

    // Mark deposit on appointment notes using __deposit:AMOUNT prefix
    const existingNotes = appointment.notes ?? "";
    const depositMarker = `__deposit:${amount}`;
    const newNotes = existingNotes.includes("__deposit:")
      ? existingNotes.replace(/__deposit:\d+(\.\d+)?/, depositMarker)
      : existingNotes
      ? `${depositMarker}\n${existingNotes}`
      : depositMarker;

    const [invoice] = await prisma.$transaction([
      prisma.invoice.create({
        data: {
          id: randomUUID(),
          salonId: appointment.salonId,
          clientId: appointment.clientId ?? null,
          appointmentId: appointment.id,
          total: amount,
          paymentMethod: paymentMethod ?? "CASH",
          status: "PAID",
          note: `Deposit for appointment on ${appointment.date} at ${appointment.startTime}`,
          InvoiceItem: {
            create: {
              id: randomUUID(),
              name: "Deposit",
              price: amount,
              qty: 1,
            },
          },
        },
      }),
      prisma.appointment.update({
        where: { id: appointmentId },
        data: { notes: newNotes },
      }),
    ]);

    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/invoices");
    return { success: true, invoiceId: invoice.id };
  } catch (err) {
    console.error("[collectDeposit]", err);
    return { success: false, error: "Failed to collect deposit" };
  }
}
