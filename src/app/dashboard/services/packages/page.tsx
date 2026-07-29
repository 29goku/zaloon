import { prisma } from "@/lib/prisma";
import { getPackages } from "@/app/actions/packages";
import { PackagesManager } from "@/components/packages/packages-manager";

export const dynamic = "force-dynamic";

export default async function PackagesPage() {
  const [packages, salon, categories] = await Promise.all([
    getPackages(),
    prisma.salon.findFirst(),
    prisma.serviceCategory.findMany({
      include: { Service: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const currency = salon?.currency ?? "USD";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  // Flatten all services with their category name for the selector
  const services = categories.flatMap((cat) =>
    cat.Service.filter((s) => s.active).map((s) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      categoryName: cat.name,
    }))
  );

  return (
    <div className="p-4 md:p-8">
      <PackagesManager packages={packages} services={services} currency={currency} />
    </div>
  );
}
