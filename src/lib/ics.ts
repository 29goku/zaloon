export function generateICS(event: {
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  organizer?: { name: string; email: string };
  uid?: string;
}): string {
  const uid = event.uid ?? `${Date.now()}@zaloon`;

  function toICSDate(iso: string): string {
    return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "").replace("Z", "Z");
  }

  const now = toICSDate(new Date().toISOString());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Zaloon//Salon Management//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${toICSDate(event.start)}`,
    `DTEND:${toICSDate(event.end)}`,
    `SUMMARY:${event.title.replace(/\n/g, "\\n")}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${event.location.replace(/\n/g, "\\n")}`);
  }
  if (event.organizer) {
    lines.push(`ORGANIZER;CN=${event.organizer.name}:mailto:${event.organizer.email}`);
  }

  lines.push("STATUS:CONFIRMED", "END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n");
}
