import { prisma } from "@/lib/prisma";
import { getPricingRules } from "@/app/actions/pricing-rules";
import { PricingRulesClient } from "@/components/pricing/pricing-rules-client";
import { PricePreview } from "@/components/pricing/price-preview";
import { Zap } from "lucide-react";
import Link from "next/link";
import { Scissors, Package2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const salon = await prisma.salon.findFirst();
  const currency = salon?.currency ?? "USD";

  const [rules, categories] = await Promise.all([
    getPricingRules(),
    prisma.serviceCategory.findMany({
      include: { Service: { where: { active: true }, select: { id: true, name: true, price: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const services = categories.flatMap((cat) =>
    cat.Service.map((s) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      categoryName: cat.name,
    }))
  );

  return (
    <div className="p-4 md:p-8">
      {/* Section tabs — consistent with services page */}
      <div className="flex gap-1 mb-6 border-b border-border">
        <Link
          href="/dashboard/services"
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          <Scissors className="w-4 h-4" />
          Services
        </Link>
        <Link
          href="/dashboard/services/packages"
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          <Package2 className="w-4 h-4" />
          Packages
        </Link>
        <span className="px-4 py-2 text-sm font-semibold text-primary border-b-2 border-primary -mb-px flex items-center gap-1.5">
          <Zap className="w-4 h-4" />
          Dynamic Pricing
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-8">
        {/* Main rules list */}
        <div>
          <PricingRulesClient rules={rules} services={services} currency={currency} />
        </div>

        {/* Sidebar: price preview */}
        <aside className="space-y-4">
          <PricePreview services={services} currency={currency} />

          {/* Info card */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              How dynamic pricing works
            </h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">1.</span>
                Rules are evaluated in priority order (higher = first).
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">2.</span>
                All matching rules are summed together.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">3.</span>
                The final price is shown to customers during booking.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">4.</span>
                Negative adjustments = discounts; positive = surcharges.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
