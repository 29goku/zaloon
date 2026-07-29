import { Zap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { QuickPayContainer } from "@/components/quick-pay/quick-pay-container";
import { getRetailProducts } from "@/app/actions/inventory";

export const dynamic = "force-dynamic";

export interface RecentInvoice {
  id: string;
  total: number;
  paymentMethod: string;
  note: string | null;
  createdAt: string;
  clientName: string | null;
}

export interface ServiceOption {
  id: string;
  name: string;
  price: number;
  categoryName: string;
}

export interface RetailProductOption {
  id: string;
  name: string;
  price: number;
  stock: number;
  unit: string;
  sku: string | null;
}

async function getRecentInvoices(): Promise<RecentInvoice[]> {
  const salon = await prisma.salon.findFirst();
  if (!salon) return [];

  const invoices = await prisma.invoice.findMany({
    where: { salonId: salon.id, appointmentId: null },
    include: { Client: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return invoices.map((inv) => ({
    id: inv.id,
    total: inv.total,
    paymentMethod: inv.paymentMethod,
    note: inv.note,
    createdAt: inv.createdAt.toISOString(),
    clientName: inv.Client?.name ?? null,
  }));
}

async function getServices(): Promise<ServiceOption[]> {
  const salon = await prisma.salon.findFirst();
  if (!salon) return [];

  const services = await prisma.service.findMany({
    where: { salonId: salon.id, active: true },
    include: { ServiceCategory: { select: { name: true } } },
    orderBy: [{ ServiceCategory: { name: "asc" } }, { name: "asc" }],
  });

  return services.map((s) => ({
    id: s.id,
    name: s.name,
    price: s.price,
    categoryName: s.ServiceCategory.name,
  }));
}

async function getRetailProductOptions(): Promise<RetailProductOption[]> {
  const products = await getRetailProducts();
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.salePrice ?? 0,
    stock: p.quantity,
    unit: p.unit,
    sku: p.sku ?? null,
  }));
}

export default async function QuickPayPage() {
  const [recentInvoices, services, retailProducts] = await Promise.all([
    getRecentInvoices(),
    getServices(),
    getRetailProductOptions(),
  ]);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Zap className="w-7 h-7 text-primary" />
          Quick Pay
        </h1>
        <p className="text-muted-foreground mt-1">Fast point-of-sale checkout</p>
      </div>

      <QuickPayContainer
        initialInvoices={recentInvoices}
        services={services}
        retailProducts={retailProducts}
      />
    </div>
  );
}
