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

function escapeCsvField(value: string | number | null | undefined): string {
  const str = String(value ?? "");
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
      StaffService: {
        select: { serviceId: true, commissionOverridePct: true },
      },
      Appointment: {
        where: {
          status: "COMPLETED",
          date: { gte: from, lte: to },
        },
        include: {
          Invoice: { select: { total: true, status: true } },
          AppointmentService: {
            include: { Service: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  // Build per-staff breakdown
  const csvLines: string[] = [];

  // Header row
  csvLines.push(
    [
      "Staff Name",
      "Phone",
      "Period Start",
      "Period End",
      "Appointments",
      "Total Revenue",
      "Default Commission %",
      "Total Commission Earned",
      "Service Name",
      "Service Count",
      "Service Revenue",
      "Service Commission %",
      "Service Commission",
    ].join(",")
  );

  for (const member of staff) {
    const overrideMap = new Map<string, number | null>();
    for (const ss of member.StaffService) {
      overrideMap.set(ss.serviceId, ss.commissionOverridePct ?? null);
    }

    const serviceMap = new Map<
      string,
      { name: string; count: number; revenue: number; commissionPct: number }
    >();

    let totalRevenue = 0;

    for (const appt of member.Appointment) {
      const inv = appt.Invoice;
      const apptRevenue =
        inv && inv.status === "PAID" ? inv.total : appt.totalAmount;

      const serviceCount = appt.AppointmentService.length;
      if (serviceCount === 0) {
        const key = "__other__";
        const existing = serviceMap.get(key);
        if (existing) {
          existing.count++;
          existing.revenue += apptRevenue;
        } else {
          serviceMap.set(key, {
            name: "Other",
            count: 1,
            revenue: apptRevenue,
            commissionPct: member.commissionPct,
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
            : member.commissionPct;
        const existing = serviceMap.get(sid);
        if (existing) {
          existing.count++;
          existing.revenue += revenuePerService;
        } else {
          serviceMap.set(sid, {
            name: as.Service.name,
            count: 1,
            revenue: revenuePerService,
            commissionPct: effectiveRate,
          });
        }
      }
      totalRevenue += apptRevenue;
    }

    const services = Array.from(serviceMap.values()).sort(
      (a, b) => b.revenue - a.revenue
    );
    const totalCommission = services.reduce(
      (s, x) => s + (x.revenue * x.commissionPct) / 100,
      0
    );
    const apptCount = member.Appointment.length;

    if (services.length === 0) {
      // Staff with no appointments — one summary row
      csvLines.push(
        [
          escapeCsvField(member.name),
          escapeCsvField(member.phone),
          escapeCsvField(from),
          escapeCsvField(to),
          escapeCsvField(apptCount),
          escapeCsvField(totalRevenue.toFixed(2)),
          escapeCsvField(member.commissionPct),
          escapeCsvField(totalCommission.toFixed(2)),
          "", "", "", "", "",
        ].join(",")
      );
    } else {
      // One row per service
      services.forEach((svc, i) => {
        const svcCommission = (svc.revenue * svc.commissionPct) / 100;
        csvLines.push(
          [
            // Staff-level columns only on first row, blank on subsequent
            escapeCsvField(i === 0 ? member.name : ""),
            escapeCsvField(i === 0 ? (member.phone ?? "") : ""),
            escapeCsvField(i === 0 ? from : ""),
            escapeCsvField(i === 0 ? to : ""),
            escapeCsvField(i === 0 ? apptCount : ""),
            escapeCsvField(i === 0 ? totalRevenue.toFixed(2) : ""),
            escapeCsvField(i === 0 ? member.commissionPct : ""),
            escapeCsvField(i === 0 ? totalCommission.toFixed(2) : ""),
            // Service columns
            escapeCsvField(svc.name),
            escapeCsvField(svc.count),
            escapeCsvField(svc.revenue.toFixed(2)),
            escapeCsvField(svc.commissionPct),
            escapeCsvField(svcCommission.toFixed(2)),
          ].join(",")
        );
      });
    }
  }

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
