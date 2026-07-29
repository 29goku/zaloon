import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scissors } from "lucide-react";
import { AddServiceDialog } from "@/components/services/add-service-dialog";
import { ServiceItem } from "@/components/services/service-item";
import { DeleteCategoryButton } from "@/components/services/delete-category-button";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const salon = await prisma.salon.findFirst();
  const currency = salon?.currency ?? "USD";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n);

  const categories = await prisma.serviceCategory.findMany({
    include: { services: true },
    orderBy: { name: "asc" },
  });

  const totalServices = categories.reduce((s, c) => s + c.services.length, 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Services</h1>
          <p className="text-muted-foreground mt-1">
            {totalServices} service{totalServices !== 1 ? "s" : ""} across{" "}
            {categories.length} categor{categories.length !== 1 ? "ies" : "y"}
          </p>
        </div>
        <AddServiceDialog categories={categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon }))} />
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-24">
          <Scissors className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No services yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => (
            <Card key={cat.id} className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <span className="text-xl">{cat.icon ?? "✂️"}</span>
                  {cat.name}
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    {cat.services.length} service{cat.services.length !== 1 ? "s" : ""}
                  </span>
                  <DeleteCategoryButton
                    categoryId={cat.id}
                    categoryName={cat.name}
                    serviceCount={cat.services.length}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {cat.services.map((service) => (
                    <ServiceItem
                      key={service.id}
                      service={service}
                      currency={currency}
                      fmt={fmt}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
