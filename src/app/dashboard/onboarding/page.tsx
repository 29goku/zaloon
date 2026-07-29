import { prisma } from "@/lib/prisma";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  let [salon, staffCount, serviceCount] = await Promise.all([
    prisma.salon.findFirst({
      select: {
        id: true,
        name: true,
        slug: true,
        phone: true,
        address: true,
        city: true,
      },
    }),
    prisma.staff.count(),
    prisma.service.count(),
  ]);

  if (!salon) {
    salon = await prisma.salon.create({
      data: {
        id: randomUUID(),
        name: "My Salon",
        slug: `salon-${randomUUID().slice(0, 8)}`,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        phone: true,
        address: true,
        city: true,
      },
    });
  }

  return (
    <OnboardingWizard
      salon={salon}
      initialServiceCount={serviceCount}
      initialStaffCount={staffCount}
    />
  );
}
