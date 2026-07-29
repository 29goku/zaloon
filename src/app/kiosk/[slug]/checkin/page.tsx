import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CheckinFlow } from "./checkin-flow";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function KioskCheckinPage({ params }: PageProps) {
  const { slug } = await params;

  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });

  if (!salon) notFound();

  return <CheckinFlow salon={salon} />;
}
