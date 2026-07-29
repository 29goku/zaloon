"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

// ── Schema upgrade note ────────────────────────────────────────────────────────
// When ready, add these fields to prisma/schema.prisma InventoryItem model and
// run `npx prisma db push` (with user consent):
//   retailPrice Float?
//   isRetail    Boolean @default(false)
//   barcode     String?
//
// Until then:
//   - isRetail  → category starts with "RETAIL_" prefix (category === "RETAIL" also counts)
//   - retailPrice → salePrice field (labeled "Retail Price" in UI)
//   - barcode   → stored in sku field (labeled "SKU / Barcode" in UI)
// ──────────────────────────────────────────────────────────────────────────────

// ── Constants ──────────────────────────────────────────────────────────────────

export const RETAIL_CATEGORY = "RETAIL";
export const RETAIL_CATEGORY_PREFIX = "RETAIL_";

export function isRetailItem(category: string): boolean {
  return category === RETAIL_CATEGORY || category.startsWith(RETAIL_CATEGORY_PREFIX);
}

const CATEGORIES = [
  "HAIR_PRODUCTS",
  "COLOR",
  "TOOLS",
  "RETAIL",
  "CONSUMABLES",
  "OTHER",
] as const;

type Category = (typeof CATEGORIES)[number];

const TRANSACTION_TYPES = ["IN", "OUT", "ADJUSTMENT"] as const;

// ── Zod schemas ────────────────────────────────────────────────────────────────

const createItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(CATEGORIES),
  sku: z.string().optional(),
  quantity: z.number().int().min(0, "Quantity must be >= 0").default(0),
  unit: z.string().min(1, "Unit is required").default("pcs"),
  minQuantity: z.number().int().min(0, "Min quantity must be >= 0").default(0),
  costPrice: z.number().positive().optional().nullable(),
  salePrice: z.number().positive().optional().nullable(),
  supplier: z.string().optional().nullable(),
});

const updateItemSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  category: z.enum(CATEGORIES).optional(),
  sku: z.string().optional().nullable(),
  quantity: z.number().int().min(0, "Quantity must be >= 0").optional(),
  unit: z.string().min(1).optional(),
  minQuantity: z.number().int().min(0).optional(),
  costPrice: z.number().positive().optional().nullable(),
  salePrice: z.number().positive().optional().nullable(),
  supplier: z.string().optional().nullable(),
});

const adjustStockSchema = z.object({
  itemId: z.string().min(1, "Item ID is required"),
  quantity: z.number().int().refine((v) => v !== 0, "Quantity must be non-zero"),
  type: z.enum(TRANSACTION_TYPES),
  note: z.string().optional(),
});

// ── createItem ─────────────────────────────────────────────────────────────────

export async function createItem(data: {
  name: string;
  category: string;
  sku?: string;
  quantity?: number;
  unit?: string;
  minQuantity?: number;
  costPrice?: number | null;
  salePrice?: number | null;
  supplier?: string | null;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const parsed = createItemSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { success: false, error: "No salon found" };

    const item = await prisma.inventoryItem.create({
      data: {
        id: randomUUID(),
        salonId: salon.id,
        name: parsed.data.name,
        category: parsed.data.category,
        sku: parsed.data.sku ?? null,
        quantity: parsed.data.quantity ?? 0,
        unit: parsed.data.unit ?? "pcs",
        minQuantity: parsed.data.minQuantity ?? 0,
        costPrice: parsed.data.costPrice ?? null,
        salePrice: parsed.data.salePrice ?? null,
        supplier: parsed.data.supplier ?? null,
      },
    });

    return { success: true, id: item.id };
  } catch (err) {
    console.error("[createItem]", err);
    return { success: false, error: "Failed to create inventory item" };
  }
}

// ── updateItem ─────────────────────────────────────────────────────────────────

export async function updateItem(
  id: string,
  data: {
    name?: string;
    category?: string;
    sku?: string | null;
    quantity?: number;
    unit?: string;
    minQuantity?: number;
    costPrice?: number | null;
    salePrice?: number | null;
    supplier?: string | null;
  }
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "id is required" };

  const parsed = updateItemSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Item not found" };

    await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.category !== undefined && { category: parsed.data.category }),
        ...(parsed.data.sku !== undefined && { sku: parsed.data.sku }),
        ...(parsed.data.quantity !== undefined && { quantity: parsed.data.quantity }),
        ...(parsed.data.unit !== undefined && { unit: parsed.data.unit }),
        ...(parsed.data.minQuantity !== undefined && { minQuantity: parsed.data.minQuantity }),
        ...(parsed.data.costPrice !== undefined && { costPrice: parsed.data.costPrice }),
        ...(parsed.data.salePrice !== undefined && { salePrice: parsed.data.salePrice }),
        ...(parsed.data.supplier !== undefined && { supplier: parsed.data.supplier }),
      },
    });

    return { success: true };
  } catch (err) {
    console.error("[updateItem]", err);
    return { success: false, error: "Failed to update inventory item" };
  }
}

// ── adjustStock ────────────────────────────────────────────────────────────────

export async function adjustStock(
  itemId: string,
  quantity: number,
  type: "IN" | "OUT" | "ADJUSTMENT",
  note?: string
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = adjustStockSchema.safeParse({ itemId, quantity, type, note });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) return { success: false, error: "Item not found" };

    // Calculate the delta based on type
    // For OUT, quantity is passed as positive but we subtract
    const delta = type === "OUT" ? -Math.abs(parsed.data.quantity) : parsed.data.quantity;
    const newQuantity = Math.max(0, item.quantity + delta);

    // Create transaction and update item quantity atomically
    await prisma.$transaction([
      prisma.inventoryTransaction.create({
        data: {
          id: randomUUID(),
          itemId,
          type,
          quantity: delta,
          note: parsed.data.note ?? null,
        },
      }),
      prisma.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: newQuantity },
      }),
    ]);

    return { success: true };
  } catch (err) {
    console.error("[adjustStock]", err);
    return { success: false, error: "Failed to adjust stock" };
  }
}

// ── getInventory ───────────────────────────────────────────────────────────────

export async function getInventory(filter?: {
  lowStock?: boolean;
  category?: string;
  search?: string;
}) {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return [];

    const items = await prisma.inventoryItem.findMany({
      where: {
        salonId: salon.id,
        ...(filter?.category && filter.category !== "ALL" && {
          category: filter.category as Category,
        }),
        ...(filter?.search && {
          OR: [
            { name: { contains: filter.search } },
            { sku: { contains: filter.search } },
            { supplier: { contains: filter.search } },
          ],
        }),
      },
      orderBy: { name: "asc" },
    });

    if (filter?.lowStock) {
      return items.filter((item) => item.quantity <= item.minQuantity);
    }

    return items;
  } catch (err) {
    console.error("[getInventory]", err);
    return [];
  }
}

// ── getLowStockItems ───────────────────────────────────────────────────────────

export async function getLowStockItems() {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return [];

    const items = await prisma.inventoryItem.findMany({
      where: { salonId: salon.id },
      orderBy: { quantity: "asc" },
    });

    return items.filter((item) => item.quantity <= item.minQuantity);
  } catch (err) {
    console.error("[getLowStockItems]", err);
    return [];
  }
}

// ── deleteInventoryItem ────────────────────────────────────────────────────────

export async function deleteInventoryItem(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "id is required" };
  try {
    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Item not found" };
    // Cascade deletes transactions (configured in schema)
    await prisma.inventoryItem.delete({ where: { id } });
    return { success: true };
  } catch (err) {
    console.error("[deleteInventoryItem]", err);
    return { success: false, error: "Failed to delete item" };
  }
}

// ── Spec-alias exports ─────────────────────────────────────────────────────────
// The spec calls for these names; they delegate to the implementations above.

export async function getInventoryItems(filter?: {
  lowStock?: boolean;
  category?: string;
  search?: string;
}) {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return [];

    const items = await prisma.inventoryItem.findMany({
      where: {
        salonId: salon.id,
        ...(filter?.category && filter.category !== "ALL" && {
          category: filter.category as Category,
        }),
        ...(filter?.search && {
          OR: [
            { name: { contains: filter.search } },
            { sku: { contains: filter.search } },
            { supplier: { contains: filter.search } },
          ],
        }),
      },
      orderBy: { name: "asc" },
      include: { _count: { select: { InventoryTransaction: true } } },
    });

    if (filter?.lowStock) {
      return items.filter((item) => item.quantity <= item.minQuantity);
    }

    return items;
  } catch (err) {
    console.error("[getInventoryItems]", err);
    return [];
  }
}

export async function createInventoryItem(data: {
  name: string;
  category: string;
  sku?: string;
  quantity?: number;
  unit?: string;
  minQuantity?: number;
  costPrice?: number | null;
  salePrice?: number | null;
  supplier?: string | null;
}) {
  return createItem(data);
}

export async function updateInventoryItem(
  id: string,
  data: {
    name?: string;
    category?: string;
    sku?: string | null;
    quantity?: number;
    unit?: string;
    minQuantity?: number;
    costPrice?: number | null;
    salePrice?: number | null;
    supplier?: string | null;
  }
) {
  return updateItem(id, data);
}

// ── sellProduct ───────────────────────────────────────────────────────────────
// Creates a SALE transaction and decrements stock.
// invoiceId is stored in the note field until schema adds a proper FK.

export async function sellProduct(
  itemId: string,
  qty: number,
  invoiceId?: string
): Promise<{ success: boolean; error?: string }> {
  if (!itemId) return { success: false, error: "itemId is required" };
  if (!Number.isInteger(qty) || qty <= 0)
    return { success: false, error: "qty must be a positive integer" };

  try {
    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) return { success: false, error: "Item not found" };
    if (item.quantity < qty)
      return { success: false, error: `Insufficient stock (${item.quantity} available)` };

    const newQuantity = item.quantity - qty;
    const note = invoiceId ? `SALE|invoice:${invoiceId}` : "SALE";

    await prisma.$transaction([
      prisma.inventoryTransaction.create({
        data: {
          id: randomUUID(),
          itemId,
          type: "OUT",
          quantity: -qty,
          note,
        },
      }),
      prisma.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: newQuantity },
      }),
    ]);

    return { success: true };
  } catch (err) {
    console.error("[sellProduct]", err);
    return { success: false, error: "Failed to record sale" };
  }
}

// ── getRetailProducts ─────────────────────────────────────────────────────────
// Returns items where category is RETAIL (the isRetail equivalent until schema migration).

export async function getRetailProducts() {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return [];

    return await prisma.inventoryItem.findMany({
      where: {
        salonId: salon.id,
        category: RETAIL_CATEGORY,
      },
      orderBy: { name: "asc" },
    });
  } catch (err) {
    console.error("[getRetailProducts]", err);
    return [];
  }
}

// ── getLowStockProducts ───────────────────────────────────────────────────────

export async function getLowStockProducts(threshold?: number) {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return [];

    const items = await prisma.inventoryItem.findMany({
      where: { salonId: salon.id },
      orderBy: { quantity: "asc" },
    });

    return items.filter((item) =>
      item.quantity <= (threshold !== undefined ? threshold : item.minQuantity)
    );
  } catch (err) {
    console.error("[getLowStockProducts]", err);
    return [];
  }
}

// ── getInventoryValue ─────────────────────────────────────────────────────────
// costValue  = sum(quantity * costPrice)
// retailValue = sum(quantity * salePrice) — salePrice serves as retailPrice

export async function getInventoryValue(): Promise<{
  costValue: number;
  retailValue: number;
  items: number;
}> {
  try {
    const salon = await prisma.salon.findFirst();
    if (!salon) return { costValue: 0, retailValue: 0, items: 0 };

    const items = await prisma.inventoryItem.findMany({
      where: { salonId: salon.id },
      select: { quantity: true, costPrice: true, salePrice: true },
    });

    const costValue = items.reduce(
      (sum, i) => sum + i.quantity * (i.costPrice ?? 0),
      0
    );
    const retailValue = items.reduce(
      (sum, i) => sum + i.quantity * (i.salePrice ?? 0),
      0
    );

    return { costValue, retailValue, items: items.length };
  } catch (err) {
    console.error("[getInventoryValue]", err);
    return { costValue: 0, retailValue: 0, items: 0 };
  }
}

// ── getProductSalesHistory ────────────────────────────────────────────────────

export async function getProductSalesHistory(itemId: string) {
  try {
    return await prisma.inventoryTransaction.findMany({
      where: {
        itemId,
        type: "OUT",
        note: { startsWith: "SALE" },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  } catch (err) {
    console.error("[getProductSalesHistory]", err);
    return [];
  }
}

// ── Purchase Orders (stored in Salon.businessHours JSON under __purchaseOrders) ──

export interface PurchaseOrderItem {
  inventoryItemId: string;
  name: string;
  qty: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  supplier: string;
  items: PurchaseOrderItem[];
  total: number;
  status: "PENDING" | "RECEIVED" | "CANCELLED";
  orderedAt: string;
  receivedAt?: string;
  notes?: string;
}

async function getSalonWithOrders() {
  const salon = await prisma.salon.findFirst();
  if (!salon) return null;
  let bh: Record<string, unknown> = {};
  try {
    bh = salon.businessHours ? JSON.parse(salon.businessHours) : {};
  } catch {
    bh = {};
  }
  const orders: PurchaseOrder[] = Array.isArray(bh.__purchaseOrders)
    ? (bh.__purchaseOrders as PurchaseOrder[])
    : [];
  return { salon, bh, orders };
}

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  try {
    const data = await getSalonWithOrders();
    if (!data) return [];
    return data.orders;
  } catch (err) {
    console.error("[getPurchaseOrders]", err);
    return [];
  }
}

export async function createPurchaseOrder(
  data: Omit<PurchaseOrder, "id" | "status" | "orderedAt">
): Promise<{ success: boolean; error?: string }> {
  try {
    const salonData = await getSalonWithOrders();
    if (!salonData) return { success: false, error: "No salon found" };
    const { salon, bh, orders } = salonData;

    const newOrder: PurchaseOrder = {
      id: randomUUID(),
      supplier: data.supplier,
      items: data.items,
      total: data.total,
      status: "PENDING",
      orderedAt: new Date().toISOString(),
      notes: data.notes,
    };

    const updatedOrders = [newOrder, ...orders];
    const updatedBh = { ...bh, __purchaseOrders: updatedOrders };

    await prisma.salon.update({
      where: { id: salon.id },
      data: { businessHours: JSON.stringify(updatedBh) },
    });

    return { success: true };
  } catch (err) {
    console.error("[createPurchaseOrder]", err);
    return { success: false, error: "Failed to create purchase order" };
  }
}

export async function receivePurchaseOrder(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const salonData = await getSalonWithOrders();
    if (!salonData) return { success: false, error: "No salon found" };
    const { salon, bh, orders } = salonData;

    const orderIdx = orders.findIndex((o) => o.id === id);
    if (orderIdx === -1) return { success: false, error: "Order not found" };

    const order = orders[orderIdx];
    if (order.status !== "PENDING")
      return { success: false, error: `Order is already ${order.status}` };

    // Update stock for each item in the order
    for (const line of order.items) {
      const item = await prisma.inventoryItem.findUnique({
        where: { id: line.inventoryItemId },
      });
      if (!item) continue;

      await prisma.$transaction([
        prisma.inventoryTransaction.create({
          data: {
            id: randomUUID(),
            itemId: line.inventoryItemId,
            type: "IN",
            quantity: line.qty,
            note: `PO received|order:${id}`,
          },
        }),
        prisma.inventoryItem.update({
          where: { id: line.inventoryItemId },
          data: { quantity: item.quantity + line.qty },
        }),
      ]);
    }

    const updatedOrders = orders.map((o, i) =>
      i === orderIdx
        ? { ...o, status: "RECEIVED" as const, receivedAt: new Date().toISOString() }
        : o
    );

    const updatedBh = { ...bh, __purchaseOrders: updatedOrders };
    await prisma.salon.update({
      where: { id: salon.id },
      data: { businessHours: JSON.stringify(updatedBh) },
    });

    return { success: true };
  } catch (err) {
    console.error("[receivePurchaseOrder]", err);
    return { success: false, error: "Failed to receive purchase order" };
  }
}

export async function cancelPurchaseOrder(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const salonData = await getSalonWithOrders();
    if (!salonData) return { success: false, error: "No salon found" };
    const { salon, bh, orders } = salonData;

    const orderIdx = orders.findIndex((o) => o.id === id);
    if (orderIdx === -1) return { success: false, error: "Order not found" };

    const updatedOrders = orders.map((o, i) =>
      i === orderIdx ? { ...o, status: "CANCELLED" as const } : o
    );

    const updatedBh = { ...bh, __purchaseOrders: updatedOrders };
    await prisma.salon.update({
      where: { id: salon.id },
      data: { businessHours: JSON.stringify(updatedBh) },
    });

    return { success: true };
  } catch (err) {
    console.error("[cancelPurchaseOrder]", err);
    return { success: false, error: "Failed to cancel purchase order" };
  }
}
