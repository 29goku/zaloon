export const EXPENSE_CATEGORIES = [
  "RENT_UTILITIES",
  "PRODUCTS_SUPPLIES",
  "STAFF",
  "MARKETING",
  "EQUIPMENT",
  "OTHER",
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export const SUBCATEGORIES: Record<ExpenseCategory, string[]> = {
  RENT_UTILITIES: ["Rent", "Electricity", "Water", "Internet"],
  PRODUCTS_SUPPLIES: ["Color", "Shampoo", "Tools", "Consumables"],
  STAFF: ["Wages", "Commissions", "Bonuses", "Training"],
  MARKETING: ["Social", "Print", "Events", "Promotions"],
  EQUIPMENT: ["Purchase", "Maintenance", "Repairs"],
  OTHER: ["Miscellaneous"],
};

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  RENT_UTILITIES: "Rent & Utilities",
  PRODUCTS_SUPPLIES: "Products & Supplies",
  STAFF: "Staff",
  MARKETING: "Marketing",
  EQUIPMENT: "Equipment",
  OTHER: "Other",
};

export const PAYMENT_METHODS = ["CASH", "CARD", "TRANSFER"] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  CARD: "Card",
  TRANSFER: "Transfer",
};

export const DEFAULT_BUDGETS: Record<ExpenseCategory, number> = {
  RENT_UTILITIES: 3000,
  PRODUCTS_SUPPLIES: 1500,
  STAFF: 5000,
  MARKETING: 800,
  EQUIPMENT: 500,
  OTHER: 300,
};
