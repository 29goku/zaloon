import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = { model: string };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const apiKey = _req.headers.get("x-api-key") ?? _req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.API_SECRET_KEY && apiKey !== process.env.API_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { model } = await params;

  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) {
      return NextResponse.json([], { status: 200 });
    }

    switch (model) {
      case "clients": {
        const clients = await prisma.client.findMany({
          where: { salonId: salon.id },
          include: {
            Invoice: { select: { total: true } },
            Appointment: { select: { id: true } },
          },
          orderBy: { name: "asc" },
        });
        return NextResponse.json(clients);
      }

      case "appointments": {
        const appointments = await prisma.appointment.findMany({
          where: { salonId: salon.id },
          include: {
            Client: { select: { id: true, name: true, phone: true, email: true } },
            Staff: { select: { id: true, name: true } },
            AppointmentService: {
              include: {
                Service: { select: { id: true, name: true, price: true } },
              },
            },
          },
          orderBy: [{ date: "desc" }, { startTime: "desc" }],
        });
        return NextResponse.json(appointments);
      }

      case "invoices": {
        const invoices = await prisma.invoice.findMany({
          where: { salonId: salon.id },
          include: {
            Client: { select: { id: true, name: true } },
            InvoiceItem: true,
          },
          orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(invoices);
      }

      case "services": {
        const services = await prisma.service.findMany({
          where: { salonId: salon.id },
          include: {
            ServiceCategory: { select: { name: true } },
          },
          orderBy: { name: "asc" },
        });
        return NextResponse.json(services);
      }

      case "staff": {
        const staff = await prisma.staff.findMany({
          where: { salonId: salon.id },
          include: {
            StaffService: {
              include: {
                Service: { select: { name: true } },
              },
            },
          },
          orderBy: { name: "asc" },
        });
        return NextResponse.json(staff);
      }

      case "expenses": {
        const expenses = await prisma.expense.findMany({
          where: { salonId: salon.id },
          orderBy: { date: "desc" },
        });
        return NextResponse.json(expenses);
      }

      default:
        return NextResponse.json({ error: "Unknown model" }, { status: 404 });
    }
  } catch (err) {
    console.error(`[export/${model}]`, err);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
