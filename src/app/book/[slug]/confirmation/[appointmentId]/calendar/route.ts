import { prisma } from "@/lib/prisma";
import { type NextRequest } from "next/server";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format a Date as a UTC datetime string for ICS: YYYYMMDDTHHmmssZ */
function fmtUtc(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** Fold long ICS lines to 75-octet limit per RFC 5545. */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let i = 0;
  // First chunk: 75 chars
  chunks.push(line.slice(0, 75));
  i = 75;
  while (i < line.length) {
    // Continuation lines start with a single space, so only 74 content chars
    chunks.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join("\r\n");
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; appointmentId: string }> }
) {
  const { slug, appointmentId } = await params;

  // Load appointment with all related data
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      Salon: {
        select: {
          name: true,
          slug: true,
          address: true,
          city: true,
          country: true,
        },
      },
      Staff: {
        select: { name: true },
      },
      AppointmentService: {
        include: {
          Service: {
            select: { name: true, durationMins: true },
          },
        },
      },
    },
  });

  if (!appointment || appointment.Salon.slug !== slug) {
    return new Response("Appointment not found", { status: 404 });
  }

  const salon = appointment.Salon;
  const services = appointment.AppointmentService.map((as) => as.Service);
  const totalDurationMins = services.reduce((s, svc) => s + svc.durationMins, 0);
  const serviceNames = services.map((s) => s.name).join(", ");

  // Build start/end in UTC from the stored local date + time
  // The date is stored as "YYYY-MM-DD" and time as "HH:MM" in local salon time.
  // We treat them as UTC here (no timezone stored in schema) — consistent with
  // the existing confirmation page approach.
  const [y, mo, d] = appointment.date.split("-").map(Number);
  const [h, m] = appointment.startTime.split(":").map(Number);
  const dtStart = new Date(Date.UTC(y, mo - 1, d, h, m, 0));
  const dtEnd = new Date(dtStart.getTime() + totalDurationMins * 60 * 1000);
  const dtStamp = new Date();

  // Build location from salon fields
  const locationParts = [salon.name, salon.address, salon.city, salon.country].filter(Boolean);
  const location = locationParts.join(", ");

  const summary = `${serviceNames} at ${salon.name}`;
  const description = `With ${appointment.Staff.name}`;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Zaloon//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${appointmentId}@zaloon`,
    `DTSTAMP:${fmtUtc(dtStamp)}`,
    `DTSTART:${fmtUtc(dtStart)}`,
    `DTEND:${fmtUtc(dtEnd)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    ...(location ? [`LOCATION:${location}`] : []),
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const icsContent = lines.map(foldLine).join("\r\n");

  const filename = `zaloon-booking-${appointmentId.slice(-6).toUpperCase()}.ics`;

  return new Response(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
