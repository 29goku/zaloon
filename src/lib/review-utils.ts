// ─── Review content parsing utilities ────────────────────────────────────────
// These are pure functions (no server/DB calls) — exported from a plain module
// so they can be used in both Server Components and Server Actions.

const RESPONSE_SEPARATOR = "\n---RESPONSE---\n";
const FLAGGED_MARKER = "__flagged:";

export function parseReviewContent(comment: string | null): {
  clientComment: string | null;
  salonResponse: string | null;
  isFlagged: boolean;
} {
  if (!comment) {
    return { clientComment: null, salonResponse: null, isFlagged: false };
  }

  const isFlagged = comment.includes(FLAGGED_MARKER);

  // Strip the flagged marker for display
  let working = comment;
  if (isFlagged) {
    working = working.replace(/\n?__flagged:[^\n]*/g, "").trim();
  }

  const sepIdx = working.indexOf(RESPONSE_SEPARATOR);
  if (sepIdx === -1) {
    // Try to parse as JSON (legacy survey format) to get text
    const clientComment = tryParseJsonText(working) ?? working;
    return { clientComment: clientComment || null, salonResponse: null, isFlagged };
  }

  const rawClient = working.slice(0, sepIdx).trim();
  const rawResponse = working.slice(sepIdx + RESPONSE_SEPARATOR.length).trim();

  const clientComment = tryParseJsonText(rawClient) ?? rawClient;

  return {
    clientComment: clientComment || null,
    salonResponse: rawResponse || null,
    isFlagged,
  };
}

function tryParseJsonText(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && "text" in parsed) {
      return (parsed as { text?: string }).text ?? null;
    }
  } catch {
    // not JSON
  }
  return null;
}

export { RESPONSE_SEPARATOR, FLAGGED_MARKER };
