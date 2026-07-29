import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CheckInFlow } from "./check-in-flow";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function KioskCheckInPage({ params }: PageProps) {
  const { slug } = await params;

  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });

  if (!salon) notFound();

  return <CheckInFlow salon={salon} />;
}
