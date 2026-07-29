import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProfileEditForm } from "./profile-edit-form";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string; clientId: string }>;
}

async function getClientForProfile(slug: string, clientId: string) {
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!salon) return null;

  const client = await prisma.client.findFirst({
    where: { id: clientId, salonId: salon.id },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      birthday: true,
      preferences: true,
    },
  });
  if (!client) return null;

  const staff = await prisma.staff.findMany({
    where: { salonId: salon.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return { salon, client, staff };
}

export default async function ClientProfilePage({ params }: PageProps) {
  const { slug, clientId } = await params;
  const data = await getClientForProfile(slug, clientId);

  if (!data) notFound();

  const { salon, client, staff } = data;

  // Parse preferences JSON
  let preferences: {
    preferredStaff?: string;
    serviceNotes?: string;
    notifySms?: boolean;
    notifyEmail?: boolean;
  } = {};
  try {
    preferences = JSON.parse(client.preferences ?? "{}") as typeof preferences;
  } catch {
    preferences = {};
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
      {/* Back link */}
      <Link
        href={`/portal/${slug}/${clientId}`}
        className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to my account
      </Link>

      {/* Heading */}
      <div>
        <h1 className="text-xl font-bold text-stone-900">Edit your profile</h1>
        <p className="text-sm text-stone-400 mt-1">
          Update your info on file with {salon.name}.
        </p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        <ProfileEditForm
          clientId={client.id}
          slug={slug}
          initialData={{
            name: client.name,
            phone: client.phone,
            email: client.email,
            birthday: client.birthday ? client.birthday.toISOString() : null,
            preferences,
          }}
          staffList={staff}
        />
      </div>
    </div>
  );
}
