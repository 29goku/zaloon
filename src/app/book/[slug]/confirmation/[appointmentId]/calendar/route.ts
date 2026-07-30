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

/**
 * Format a local datetime string for ICS using TZID format: YYYYMMDDTHHmmss
 * Returns the wall-clock time in the given IANA timezone without a Z suffix.
 * Uses Intl.DateTimeFormat to extract the local parts for the given timezone.
 */
function fmtLocalInTimezone(d: Date, tzid: string): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tzid,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
    // hour12:false can produce "24" for midnight; normalise to "00"
    const hh = parts.hour === "24" ? "00" : parts.hour;
    return `${parts.year}${parts.month}${parts.day}T${hh}${parts.minute}${parts.second}`;
  } catch {
    // Fallback: treat as UTC if timezone is invalid
    return fmtUtc(d).replace("Z", "");
  }
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
          timezone: true,
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

  // Determine the salon's IANA timezone. If none is stored, fall back to UTC.
  const salonTimezone = salon.timezone && salon.timezone.trim() ? salon.timezone.trim() : "UTC";

  // Build start date/time interpreted as wall-clock time in the salon's timezone.
  // The date is stored as "YYYY-MM-DD" and time as "HH:MM" in local salon time.
  // We construct a UTC Date that represents that wall-clock moment in the salon's
  // timezone by using Intl.DateTimeFormat to find the UTC offset at that instant.
  const [y, mo, d] = appointment.date.split("-").map(Number);
  const [h, m] = appointment.startTime.split(":").map(Number);

  // Build a candidate UTC date assuming the stored time IS UTC, then adjust
  // by computing the actual offset the timezone has at that moment.
  let dtStart: Date;
  let dtEnd: Date;
  try {
    // Parse the local time in the salon's timezone via a formatted parse trick.
    // We format a known ISO string through the target TZ to get the offset, then
    // apply it. The simplest correct approach: construct the date with a UTC guess,
    // then compare what wall-clock time that produces in the target TZ.
    const naiveUtc = new Date(Date.UTC(y, mo - 1, d, h, m, 0));
    const localStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: salonTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(naiveUtc);
    // en-CA produces "YYYY-MM-DD, HH:MM:SS"
    const [datePart, timePart] = localStr.split(", ");
    const [ly, lmo, ld] = datePart.split("-").map(Number);
    const [lh, lmin, ls] = timePart.split(":").map(Number);
    const localAsUtc = new Date(Date.UTC(ly, lmo - 1, ld, lh, lmin, ls));
    // The offset the TZ applies: naiveUtc (treated as wall clock) minus what that
    // UTC instant reads as local time gives us the correction.
    const offsetMs = naiveUtc.getTime() - localAsUtc.getTime();
    dtStart = new Date(naiveUtc.getTime() + offsetMs);
    dtEnd = new Date(dtStart.getTime() + totalDurationMins * 60 * 1000);
  } catch {
    // Fallback to treating stored time as UTC
    dtStart = new Date(Date.UTC(y, mo - 1, d, h, m, 0));
    dtEnd = new Date(dtStart.getTime() + totalDurationMins * 60 * 1000);
  }

  const dtStamp = new Date();

  // Build location from salon fields
  const locationParts = [salon.name, salon.address, salon.city, salon.country].filter(Boolean);
  const location = locationParts.join(", ");

  const summary = `${serviceNames} at ${salon.name}`;
  const description = `With ${appointment.Staff.name}`;

  // Use TZID format for DTSTART/DTEND so calendar apps display the correct local
  // time regardless of the viewer's system timezone.
  const localStart = fmtLocalInTimezone(dtStart, salonTimezone);
  const localEnd = fmtLocalInTimezone(dtEnd, salonTimezone);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Zaloon//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${appointmentId}@zaloon`,
    `DTSTAMP:${fmtUtc(dtStamp)}`,
    `DTSTART;TZID=${salonTimezone}:${localStart}`,
    `DTEND;TZID=${salonTimezone}:${localEnd}`,
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
