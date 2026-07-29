import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProfilePage({ params }: PageProps) {
  const { slug } = await params;

  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });

  if (!salon) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
      {/* Back link */}
      <Link
        href={`/portal/${slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to portal
      </Link>

      {/* Heading */}
      <div>
        <h1 className="text-xl font-bold text-stone-900">Edit your profile</h1>
        <p className="text-sm text-stone-400 mt-1">
          Update your name, email, and birthday on file with {salon.name}.
        </p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        <ProfileForm slug={slug} />
      </div>
    </div>
  );
}
