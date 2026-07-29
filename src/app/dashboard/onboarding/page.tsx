import { prisma } from "@/lib/prisma";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const [salon, staffCount, serviceCount] = await Promise.all([
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
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">No salon found. Please contact support.</p>
      </div>
    );
  }

  return (
    <OnboardingWizard
      salon={salon}
      initialServiceCount={serviceCount}
      initialStaffCount={staffCount}
    />
  );
}
