import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateICS } from "@/lib/ics";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const { appointmentId } = await params;

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      Client: true,
      Staff: true,
      AppointmentService: { include: { Service: true } },
      Salon: true,
    },
  });

  if (!appt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [h, m] = appt.startTime.split(":").map(Number);
  const totalDuration = appt.AppointmentService.reduce(
    (sum, as) => sum + as.Service.durationMins,
    0
  ) || 60;

  const startDate = new Date(`${appt.date}T${appt.startTime}:00`);
  const endDate = new Date(startDate.getTime() + totalDuration * 60 * 1000);
  void h; void m;

  const serviceNames = appt.AppointmentService.map((as) => as.Service.name).join(", ");
  const title = `${serviceNames} at ${appt.Salon.name}`;

  const ics = generateICS({
    title,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    location: appt.Salon.address ?? appt.Salon.name,
    description: `Appointment with ${appt.Staff.name}`,
    uid: `appt-${appt.id}@zaloon`,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="appointment-${appt.id}.ics"`,
    },
  });
}
