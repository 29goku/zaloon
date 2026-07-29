import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getIntakeFormFields } from "@/app/actions/intake";
import { IntakeFormClient } from "./intake-form-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const salon = await prisma.salon.findFirst({ where: { slug }, select: { name: true } });
  return {
    title: salon ? `New Client Registration – ${salon.name}` : "New Client Registration",
    description: salon ? `Register as a new client at ${salon.name}` : "New client registration form",
  };
}

export default async function IntakePage({ params }: PageProps) {
  const { slug } = await params;

  const salon = await prisma.salon.findFirst({
    where: { slug },
    select: { id: true, name: true, slug: true, logo: true },
  });

  if (!salon) notFound();

  const fields = await getIntakeFormFields();

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-white" data-theme="light">
      <div className="max-w-lg mx-auto">
        <IntakeFormClient
          salonName={salon.name}
          salonLogo={salon.logo}
          salonSlug={salon.slug}
          fields={fields}
        />
      </div>

      {/* Minimal footer */}
      <div className="text-center py-6 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          Powered by <span className="font-semibold text-gray-500">Zaloon</span>
        </p>
      </div>
    </main>
  );
}
