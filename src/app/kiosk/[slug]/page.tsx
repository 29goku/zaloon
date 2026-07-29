import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { KioskWelcomeClient } from "./welcome-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { name: true },
  });
  return {
    title: salon ? `Welcome — ${salon.name}` : "Kiosk",
  };
}

export default async function KioskLandingPage({ params }: PageProps) {
  const { slug } = await params;

  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true, name: true, logo: true, slug: true },
  });

  if (!salon) notFound();

  const waitingCount = await prisma.waitlist.count({
    where: { salonId: salon.id, status: "WAITING" },
  });

  return (
    <KioskWelcomeClient
      salon={{ id: salon.id, name: salon.name, logo: salon.logo, slug: salon.slug }}
      waitingCount={waitingCount}
    />
  );
}
