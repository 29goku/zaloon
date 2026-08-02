import "server-only"
import { prisma } from "@/lib/prisma"

/**
 * Returns all invoices (with tip > 0) for appointments served by a specific staff member
 * within the given date range. Invoice.tip is a direct Float field on the Invoice model.
 */
export async function getTipsForStaff(
  salonId: string,
  staffId: string,
  from: Date,
  to: Date
) {
  return prisma.invoice.findMany({
    where: {
      salonId,
      tip: { gt: 0 },
      createdAt: { gte: from, lte: to },
      Appointment: { staffId },
    },
    select: {
      id: true,
      tip: true,
      createdAt: true,
      appointmentId: true,
    },
    orderBy: { createdAt: "desc" },
  })
}

/**
 * Sums the total tips earned by a staff member within the given date range.
 */
export async function getTotalTipsForStaff(
  salonId: string,
  staffId: string,
  from: Date,
  to: Date
): Promise<number> {
  const result = await prisma.invoice.aggregate({
    where: {
      salonId,
      createdAt: { gte: from, lte: to },
      Appointment: { staffId },
    },
    _sum: { tip: true },
  })
  return result._sum.tip ?? 0
}
