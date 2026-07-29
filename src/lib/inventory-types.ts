export const RETAIL_CATEGORY = "RETAIL";
export const RETAIL_CATEGORY_PREFIX = "RETAIL_";

export function isRetailItem(category: string): boolean {
  return category === RETAIL_CATEGORY || category.startsWith(RETAIL_CATEGORY_PREFIX);
}

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
