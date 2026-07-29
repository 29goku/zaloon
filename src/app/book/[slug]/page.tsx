import { prisma } from "@/lib/prisma";
import { BookingWizard } from "./booking-wizard";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function BookingPage({ params }: PageProps) {
  const { slug } = await params;

  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      logo: true,
      slug: true,
      city: true,
      country: true,
      phone: true,
      currency: true,
      categories: {
        select: {
          id: true,
          name: true,
          icon: true,
          services: {
            select: {
              id: true,
              name: true,
              price: true,
              durationMins: true,
              staff: {
                select: {
                  staff: {
                    select: {
                      id: true,
                      name: true,
                      avatar: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!salon) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 dark:from-stone-950 dark:to-stone-900 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✂️</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-2">
            Salon Not Found
          </h1>
          <p className="text-stone-500 dark:text-stone-400">
            We couldn&apos;t find a salon at this link. Please check the URL and try again.
          </p>
        </div>
      </div>
    );
  }

  // Flatten categories/services into a shape the wizard can use
  const categories = salon.categories
    .filter((cat) => cat.services.length > 0)
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      services: cat.services.map((svc) => ({
        id: svc.id,
        name: svc.name,
        price: svc.price,
        durationMins: svc.durationMins,
        staff: svc.staff.map((ss) => ss.staff),
      })),
    }));

  return (
    <BookingWizard
      salon={{
        id: salon.id,
        name: salon.name,
        logo: salon.logo,
        slug: salon.slug,
        city: salon.city,
        currency: salon.currency,
      }}
      categories={categories}
    />
  );
}
