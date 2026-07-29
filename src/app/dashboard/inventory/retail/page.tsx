import { prisma } from "@/lib/prisma";
import { RETAIL_CATEGORY } from "@/lib/inventory-types";
import { RetailPOS } from "@/components/inventory/retail-pos";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RetailPOSPage() {
  const [retailItems, salon] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { category: RETAIL_CATEGORY },
      orderBy: { name: "asc" },
    }),
    prisma.salon.findFirst({
      select: { taxRate: true, currency: true },
    }),
  ]);

  const taxRate = salon?.taxRate ?? 0;

  return (
    <div className="p-6 md:p-8 h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/inventory"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Inventory
          </Link>
          <span className="text-muted-foreground">/</span>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Retail POS</h1>
          </div>
        </div>
        <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
          {retailItems.length} product{retailItems.length !== 1 ? "s" : ""}
        </span>
      </div>

      <RetailPOS items={retailItems} taxRate={taxRate} />
    </div>
  );
}
