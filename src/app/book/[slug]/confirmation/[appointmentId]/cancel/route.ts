import { prisma } from "@/lib/prisma";
import { type NextRequest } from "next/server";

/**
 * POST /book/[slug]/confirmation/[appointmentId]/cancel
 *
 * Cancels the appointment (sets status to CANCELLED and appends a
 * "Cancelled by client" note) then returns a redirect to a success page.
 *
 * The cancellation is intentionally idempotent: cancelling an already-cancelled
 * appointment is a no-op rather than an error.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; appointmentId: string }> }
) {
  const { slug, appointmentId } = await params;

  try {
    // Load the appointment to verify it belongs to this salon
    const existing = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        status: true,
        notes: true,
        Salon: { select: { slug: true } },
      },
    });

    if (!existing || existing.Salon.slug !== slug) {
      return new Response(
        JSON.stringify({ error: "Appointment not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Already cancelled — return success without re-writing
    if (existing.status === "CANCELLED") {
      return Response.redirect(
        new URL(`/book/${slug}/manage/${appointmentId}?cancelled=1`, _request.url),
        303
      );
    }

    // Prevent cancellation of completed / no-show appointments
    if (existing.status === "COMPLETED" || existing.status === "NO_SHOW") {
      return new Response(
        JSON.stringify({ error: `Cannot cancel an appointment with status: ${existing.status}` }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // Append cancellation note
    const cancellationNote = "Cancelled by client";
    const updatedNotes = existing.notes
      ? `${existing.notes}\n${cancellationNote}`
      : cancellationNote;

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "CANCELLED",
        notes: updatedNotes,
      },
    });

    // Notify any waiting waitlist entries for this date
    try {
      const full = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { date: true, salonId: true },
      });
      if (full?.date) {
        await prisma.waitlist.updateMany({
          where: {
            salonId: full.salonId,
            status: "WAITING",
            OR: [{ preferredDate: full.date }, { preferredDate: null }],
          },
          data: { slotAvailableAt: new Date() },
        });
      }
    } catch {
      // Non-fatal: waitlist notification failure must not block the response
    }

    // Redirect to the manage page with a cancelled flag
    return Response.redirect(
      new URL(`/book/${slug}/manage/${appointmentId}?cancelled=1`, _request.url),
      303
    );
  } catch (err) {
    console.error("[POST /cancel]", err);
    return new Response(
      JSON.stringify({ error: "Failed to cancel appointment. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
