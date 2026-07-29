export type NoteType = "general" | "allergy" | "preference" | "service" | "medical";

export type ClientNote = {
  id: string;
  text: string;
  type: NoteType;
  isPinned: boolean;
  createdAt: string;
};

export function parseClientNotes(raw: string | null): ClientNote[] {
  if (!raw?.trim()) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed as ClientNote[];
    } catch {
      // fall through to legacy parsing
    }
  }
  const entries = trimmed.split(/\n\n+/).filter(Boolean);
  return entries.map((entry, i) => {
    const match = entry.match(/^\[([^\]]+)\]\s([\s\S]+)$/);
    const text = match ? match[2] : entry;
    const dateStr = match ? match[1] : "";
    const isPinned = text.includes("📌");
    const cleanText = text.replace(/^📌\s*/, "").trim();
    return {
      id: `legacy-${i}`,
      text: cleanText,
      type: "general" as NoteType,
      isPinned,
      createdAt: dateStr ? new Date(dateStr).toISOString() : new Date(0).toISOString(),
    };
  });
}
