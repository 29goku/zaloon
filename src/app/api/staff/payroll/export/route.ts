import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getDefaultRange(): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const defaults = getDefaultRange();
  const from = searchParams.get("from") ?? defaults.from;
  const to = searchParams.get("to") ?? defaults.to;

  const staff = await prisma.staff.findMany({
    orderBy: { name: "asc" },
    include: {
      Appointment: {
        where: {
          status: "COMPLETED",
          date: { gte: from, lte: to },
        },
        include: {
          Invoice: {
            select: { total: true, status: true },
          },
        },
      },
    },
  });

  const rows = staff.map((member) => {
    const appointmentCount = member.Appointment.length;
    const revenue = member.Appointment.reduce((sum: number, appt) => {
      const inv = appt.Invoice;
      if (inv && inv.status === "PAID") return sum + inv.total;
      return sum + appt.totalAmount;
    }, 0);
    const commissionEarned = revenue * (member.commissionPct / 100);
    return {
      name: member.name,
      phone: member.phone ?? "",
      commissionPct: member.commissionPct,
      appointmentCount,
      revenue,
      commissionEarned,
    };
  });

  const headers = ["Staff Name", "Phone", "Appointments", "Revenue", "Commission%", "Commission Earned"];
  const csvLines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        escapeCsvField(r.name),
        escapeCsvField(r.phone),
        escapeCsvField(r.appointmentCount),
        escapeCsvField(r.revenue.toFixed(2)),
        escapeCsvField(r.commissionPct),
        escapeCsvField(r.commissionEarned.toFixed(2)),
      ].join(",")
    ),
  ];

  const csv = csvLines.join("\n");
  const filename = `payroll_${from}_to_${to}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
