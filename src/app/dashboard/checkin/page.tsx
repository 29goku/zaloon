import { prisma } from "@/lib/prisma";
import { CheckInBoardClient } from "./check-in-board-client";

export const revalidate = 30;

export default async function CheckInBoardPage() {
  const today = new Date().toISOString().split("T")[0];

  const [appointments, salon] = await Promise.all([
    prisma.appointment.findMany({
      where: { date: today, status: { not: "CANCELLED" } },
      orderBy: { startTime: "asc" },
      include: {
        Client: { select: { id: true, name: true, phone: true } },
        Staff: { select: { id: true, name: true } },
        AppointmentService: {
          include: {
            Service: {
              select: { id: true, name: true, durationMins: true, price: true },
            },
          },
        },
      },
    }),
    prisma.salon.findFirst({ select: { currency: true } }),
  ]);

  const mapped = appointments.map((a) => ({
    id: a.id,
    status: a.status,
    startTime: a.startTime,
    date: a.date,
    notes: a.notes,
    totalAmount: a.totalAmount,
    client: a.Client
      ? { id: a.Client.id, name: a.Client.name, phone: a.Client.phone }
      : null,
    staff: { id: a.Staff.id, name: a.Staff.name },
    services: a.AppointmentService.map((as) => ({
      service: {
        id: as.Service.id,
        name: as.Service.name,
        durationMins: as.Service.durationMins,
        price: as.Service.price,
      },
    })),
  }));

  return (
    <CheckInBoardClient
      appointments={mapped}
      currency={salon?.currency ?? "USD"}
      today={today}
    />
  );
}
