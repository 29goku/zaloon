import { getTimeSummary } from "@/app/actions/timetracking";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.API_SECRET_KEY && apiKey !== process.env.API_SECRET_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");

  const from = fromStr ? new Date(fromStr) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = toStr ? new Date(toStr) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

  const summary = await getTimeSummary(from, to);

  const rows: string[] = [
    "Staff Name,Days Worked,Total Hours,Avg Hours/Day",
  ];

  for (const row of summary) {
    rows.push(
      [
        `"${row.staffName}"`,
        row.daysWorked,
        row.totalHours.toFixed(2),
        row.avgHoursPerDay.toFixed(2),
      ].join(",")
    );
  }

  const csv = rows.join("\n");
  const filename = `timeclock-${fromStr ?? "start"}-to-${toStr ?? "end"}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
