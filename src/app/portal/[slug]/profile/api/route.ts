import { prisma } from "@/lib/prisma";
import { type NextRequest } from "next/server";

/**
 * GET /portal/[slug]/profile/api?phone=XXXXX
 *
 * Returns basic profile fields for a client identified by phone number.
 * Used by the client-side ProfileForm to pre-populate the edit form.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const phone = request.nextUrl.searchParams.get("phone")?.trim();
  if (!phone) {
    return Response.json({ error: "Phone number is required" }, { status: 400 });
  }

  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!salon) {
    return Response.json({ error: "Salon not found" }, { status: 404 });
  }

  const client = await prisma.client.findFirst({
    where: { salonId: salon.id, phone },
    select: {
      id: true,
      name: true,
      email: true,
      birthday: true,
    },
  });

  if (!client) {
    return Response.json(
      { error: "No account found for that phone number." },
      { status: 404 }
    );
  }

  return Response.json({
    id: client.id,
    name: client.name,
    email: client.email ?? "",
    // Return birthday as YYYY-MM-DD string for the date input
    birthday: client.birthday
      ? new Date(client.birthday).toISOString().split("T")[0]
      : "",
  });
}
