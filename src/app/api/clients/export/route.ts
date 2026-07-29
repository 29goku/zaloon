import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function escapeCsv(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  // Wrap in quotes if the value contains a comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export async function GET() {
  const rawClients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: {
      Appointment: {
        select: {
          totalAmount: true,
          date: true,
          status: true,
        },
      },
      LedgerEntry: {
        select: { type: true, amount: true },
      },
    },
  });

  const headers = [
    "Name",
    "Phone",
    "Email",
    "Birthday",
    "Total Visits",
    "Total Spent",
    "Last Visit",
    "Balance",
  ];

  const rows = rawClients.map((c) => {
    const totalVisits = c.Appointment.length;
    const totalSpent = c.Appointment.reduce(
      (sum: number, a) => sum + a.totalAmount,
      0
    );

    // Last visit: max date among appointments (date is stored as a string "YYYY-MM-DD")
    const lastVisit =
      c.Appointment.length > 0
        ? c.Appointment.reduce((max: string, a) => (a.date > max ? a.date : max), "")
        : null;

    const balance = c.LedgerEntry.reduce((sum: number, entry) => {
      return entry.type === "CREDIT" ? sum + entry.amount : sum - entry.amount;
    }, 0);

    return [
      escapeCsv(c.name),
      escapeCsv(c.phone),
      escapeCsv(c.email),
      escapeCsv(formatDate(c.birthday)),
      escapeCsv(String(totalVisits)),
      escapeCsv(totalSpent.toFixed(2)),
      escapeCsv(lastVisit ?? ""),
      escapeCsv(balance.toFixed(2)),
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="clients.csv"',
    },
  });
}
