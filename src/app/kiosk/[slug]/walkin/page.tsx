import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WalkInFlow } from "./walkin-flow";

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
        select: {
          id: true,
          name: true,
          icon: true,
          Service: {
            where: { active: true },
            select: {
              id: true,
              name: true,
              price: true,
              durationMins: true,
            },
            orderBy: { name: "asc" },
          },
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!salon) notFound();

  const services = salon.ServiceCategory.flatMap((cat) =>
    cat.Service.map((svc) => ({
      id: svc.id,
      name: svc.name,
      price: svc.price,
      durationMins: svc.durationMins,
      categoryName: cat.name,
    }))
  );

  return (
    <WalkInFlow
      salon={{ id: salon.id, name: salon.name, slug: salon.slug, currency: salon.currency }}
      services={services}
    />
  );
}
