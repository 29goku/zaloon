import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WalkInFlow } from "./walk-in-flow";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function KioskWalkInPage({ params }: PageProps) {
  const { slug } = await params;

  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      currency: true,
      ServiceCategory: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          icon: true,
          Service: {
            where: { active: true },
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              price: true,
              durationMins: true,
            },
          },
        },
      },
      Staff: {
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      },
    },
  });

  if (!salon) notFound();

  return (
    <WalkInFlow
      salon={{
        id: salon.id,
        name: salon.name,
        slug: salon.slug,
        currency: salon.currency,
      }}
      categories={salon.ServiceCategory.map((cat) => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        services: cat.Service,
      }))}
      staffList={salon.Staff}
    />
  );
}
