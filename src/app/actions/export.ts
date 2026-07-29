"use server";

import { prisma } from "@/lib/prisma";
import { objectsToCSV } from "@/lib/csv";

function today(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Clients ───────────────────────────────────────────────────────────────────

export async function exportClients(filter?: {
  vipOnly?: boolean;
  since?: string;
}): Promise<{ filename: string; csv: string }> {
  const salon = await prisma.salon.findFirst();
  if (!salon) return { filename: "clients.csv", csv: "" };

  const clients = await prisma.client.findMany({
    where: {
      salonId: salon.id,
      ...(filter?.vipOnly ? { isVip: true } : {}),
      ...(filter?.since
        ? { createdAt: { gte: new Date(filter.since) } }
        : {}),
    },
    include: {
      Appointment: {
        where: { status: "COMPLETED" },
        include: { Invoice: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const rows = clients.map((c) => {
    const completedAppts = c.Appointment;
    const totalSpent = completedAppts.reduce(
      (sum, a) => sum + (a.Invoice?.total ?? 0),
      0
    );
    const lastAppt = completedAppts.sort(
      (a, b) => (a.date > b.date ? -1 : 1)
    )[0];

    let tags = "";
    try {
      tags = JSON.parse(c.tags ?? "[]").join(", ");
    } catch {
      tags = c.tags ?? "";
    }

    return {
      id: c.id,
      name: c.name,
      phone: c.phone ?? "",
      email: c.email ?? "",
      birthday: c.birthday ? c.birthday.toISOString().split("T")[0] : "",
      notes: c.notes ?? "",
      tags,
      isVip: c.isVip ? "Yes" : "No",
      loyaltyPoints: c.loyaltyPoints,
      totalVisits: completedAppts.length,
      totalSpent: totalSpent.toFixed(2),
      lastVisit: lastAppt?.date ?? "",
      createdAt: c.createdAt.toISOString().split("T")[0],
    };
  });

  const prefix = filter?.vipOnly ? "vip-clients" : filter?.since ? "new-clients" : "clients";
  return {
    filename: `${prefix}-${today()}.csv`,
    csv: objectsToCSV(rows, [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "birthday", label: "Birthday" },
      { key: "notes", label: "Notes" },
      { key: "tags", label: "Tags" },
      { key: "isVip", label: "VIP" },
      { key: "loyaltyPoints", label: "Loyalty Points" },
      { key: "totalVisits", label: "Total Visits" },
      { key: "totalSpent", label: "Total Spent" },
      { key: "lastVisit", label: "Last Visit" },
      { key: "createdAt", label: "Member Since" },
    ]),
  };
}

// ── Appointments ──────────────────────────────────────────────────────────────

export async function exportAppointments(filter: {
  from: string;
  to: string;
  status?: string;
}): Promise<{ filename: string; csv: string }> {
  const salon = await prisma.salon.findFirst();
  if (!salon) return { filename: "appointments.csv", csv: "" };

  const statusFilter =
    filter.status && filter.status !== "ALL"
      ? { status: filter.status }
      : {};

  const appointments = await prisma.appointment.findMany({
    where: {
      salonId: salon.id,
      date: { gte: filter.from, lte: filter.to },
      ...statusFilter,
    },
    include: {
      Client: true,
      Staff: true,
      AppointmentService: { include: { Service: true } },
      Invoice: true,
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  const rows = appointments.map((a) => {
    const services = a.AppointmentService.map((as) => as.Service.name).join(
      " | "
    );
    return {
      id: a.id,
      date: a.date,
      time: a.startTime,
      client: a.Client?.name ?? "(Walk-in)",
      clientPhone: a.Client?.phone ?? "",
      staff: a.Staff.name,
      services,
      amount: a.totalAmount.toFixed(2),
      tip: (a.Invoice?.tip ?? 0).toFixed(2),
      discount: (a.Invoice?.discount ?? 0).toFixed(2),
      paymentMethod: a.Invoice?.paymentMethod ?? "",
      status: a.status,
      notes: a.notes ?? "",
    };
  });

  return {
    filename: `appointments-${filter.from}-${filter.to}.csv`,
    csv: objectsToCSV(rows, [
      { key: "id", label: "ID" },
      { key: "date", label: "Date" },
      { key: "time", label: "Time" },
      { key: "client", label: "Client" },
      { key: "clientPhone", label: "Client Phone" },
      { key: "staff", label: "Staff" },
      { key: "services", label: "Services" },
      { key: "amount", label: "Amount" },
      { key: "tip", label: "Tip" },
      { key: "discount", label: "Discount" },
      { key: "paymentMethod", label: "Payment Method" },
      { key: "status", label: "Status" },
      { key: "notes", label: "Notes" },
    ]),
  };
}

// ── Revenue ───────────────────────────────────────────────────────────────────

export async function exportRevenue(filter: {
  from: string;
  to: string;
}): Promise<{ filename: string; csv: string }> {
  const salon = await prisma.salon.findFirst();
  if (!salon) return { filename: "revenue.csv", csv: "" };

  const invoices = await prisma.invoice.findMany({
    where: {
      salonId: salon.id,
      createdAt: {
        gte: new Date(filter.from),
        lte: new Date(filter.to + "T23:59:59Z"),
      },
      status: "PAID",
    },
    include: {
      Client: true,
      Appointment: {
        include: {
          AppointmentService: { include: { Service: true } },
        },
      },
      InvoiceItem: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const rows = invoices.map((inv) => {
    const services = inv.Appointment?.AppointmentService?.map(
      (as) => as.Service.name
    ).join(" | ") ?? inv.InvoiceItem.map((i) => i.name).join(" | ");

    const subtotal = inv.total - (inv.tip ?? 0) + (inv.discount ?? 0);

    return {
      date: inv.createdAt.toISOString().split("T")[0],
      invoice: `${salon.invoicePrefix}-${inv.id.slice(-6).toUpperCase()}`,
      client: inv.Client?.name ?? "(Walk-in)",
      services,
      subtotal: subtotal.toFixed(2),
      discount: (inv.discount ?? 0).toFixed(2),
      couponDiscount: (inv.couponDiscount ?? 0).toFixed(2),
      tip: (inv.tip ?? 0).toFixed(2),
      total: inv.total.toFixed(2),
      paymentMethod: inv.paymentMethod,
      giftCardAmount: (inv.giftCardAmount ?? 0).toFixed(2),
    };
  });

  return {
    filename: `revenue-${filter.from}-${filter.to}.csv`,
    csv: objectsToCSV(rows, [
      { key: "date", label: "Date" },
      { key: "invoice", label: "Invoice #" },
      { key: "client", label: "Client" },
      { key: "services", label: "Services" },
      { key: "subtotal", label: "Subtotal" },
      { key: "discount", label: "Discount" },
      { key: "couponDiscount", label: "Coupon Discount" },
      { key: "tip", label: "Tip" },
      { key: "total", label: "Total" },
      { key: "paymentMethod", label: "Payment Method" },
      { key: "giftCardAmount", label: "Gift Card Used" },
    ]),
  };
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export async function exportExpenses(filter: {
  from: string;
  to: string;
}): Promise<{ filename: string; csv: string }> {
  const salon = await prisma.salon.findFirst();
  if (!salon) return { filename: "expenses.csv", csv: "" };

  const expenses = await prisma.expense.findMany({
    where: {
      salonId: salon.id,
      date: { gte: filter.from, lte: filter.to },
    },
    orderBy: { date: "asc" },
  });

  const rows = expenses.map((e) => ({
    date: e.date,
    category: e.category,
    subcategory: e.subcategory ?? "",
    description: e.description,
    amount: e.amount.toFixed(2),
    vendor: e.vendor ?? "",
    paymentMethod: e.paymentMethod,
    isRecurring: e.isRecurring ? "Yes" : "No",
    notes: e.notes ?? "",
  }));

  return {
    filename: `expenses-${filter.from}-${filter.to}.csv`,
    csv: objectsToCSV(rows, [
      { key: "date", label: "Date" },
      { key: "category", label: "Category" },
      { key: "subcategory", label: "Subcategory" },
      { key: "description", label: "Description" },
      { key: "amount", label: "Amount" },
      { key: "vendor", label: "Vendor" },
      { key: "paymentMethod", label: "Payment Method" },
      { key: "isRecurring", label: "Recurring" },
      { key: "notes", label: "Notes" },
    ]),
  };
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export async function exportInventory(opts?: {
  lowStockOnly?: boolean;
  includeTransactions?: boolean;
  from?: string;
  to?: string;
}): Promise<{ filename: string; csv: string }> {
  const salon = await prisma.salon.findFirst();
  if (!salon) return { filename: "inventory.csv", csv: "" };

  const items = await prisma.inventoryItem.findMany({
    where: {
      salonId: salon.id,
    },
    include: {
      InventoryTransaction: opts?.includeTransactions
        ? {
            where:
              opts.from && opts.to
                ? {
                    createdAt: {
                      gte: new Date(opts.from),
                      lte: new Date(opts.to + "T23:59:59Z"),
                    },
                  }
                : undefined,
            orderBy: { createdAt: "desc" },
          }
        : false,
    },
    orderBy: { name: "asc" },
  });

  if (opts?.includeTransactions) {
    const rows: Record<string, unknown>[] = [];
    for (const item of items) {
      for (const tx of item.InventoryTransaction) {
        rows.push({
          date: tx.createdAt.toISOString().split("T")[0],
          itemName: item.name,
          category: item.category,
          sku: item.sku ?? "",
          type: tx.type,
          quantity: tx.quantity,
          note: tx.note ?? "",
        });
      }
    }
    return {
      filename: `inventory-transactions-${today()}.csv`,
      csv: objectsToCSV(rows as Record<string, unknown>[], [
        { key: "date", label: "Date" },
        { key: "itemName", label: "Item" },
        { key: "category", label: "Category" },
        { key: "sku", label: "SKU" },
        { key: "type", label: "Type" },
        { key: "quantity", label: "Quantity" },
        { key: "note", label: "Note" },
      ]),
    };
  }

  // Filter low-stock in JS (Prisma raw comparison not easily expressible)
  const filteredItems = opts?.lowStockOnly
    ? items.filter((i) => i.minQuantity > 0 && i.quantity <= i.minQuantity)
    : items;

  const rows = filteredItems.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    sku: i.sku ?? "",
    quantity: i.quantity,
    unit: i.unit,
    minQuantity: i.minQuantity,
    costPrice: i.costPrice != null ? i.costPrice.toFixed(2) : "",
    salePrice: i.salePrice != null ? i.salePrice.toFixed(2) : "",
    stockValue:
      i.costPrice != null ? (i.costPrice * i.quantity).toFixed(2) : "",
    supplier: i.supplier ?? "",
    lowStock:
      i.minQuantity > 0 && i.quantity <= i.minQuantity ? "Yes" : "No",
  }));

  const prefix = opts?.lowStockOnly ? "inventory-low-stock" : "inventory";
  return {
    filename: `${prefix}-${today()}.csv`,
    csv: objectsToCSV(rows, [
      { key: "id", label: "ID" },
      { key: "name", label: "Item" },
      { key: "category", label: "Category" },
      { key: "sku", label: "SKU" },
      { key: "quantity", label: "Qty" },
      { key: "unit", label: "Unit" },
      { key: "minQuantity", label: "Min Qty" },
      { key: "costPrice", label: "Cost Price" },
      { key: "salePrice", label: "Sale Price" },
      { key: "stockValue", label: "Stock Value" },
      { key: "supplier", label: "Supplier" },
      { key: "lowStock", label: "Low Stock" },
    ]),
  };
}

// ── Payroll ───────────────────────────────────────────────────────────────────

export async function exportPayroll(filter: {
  from: string;
  to: string;
}): Promise<{ filename: string; csv: string }> {
  const salon = await prisma.salon.findFirst();
  if (!salon) return { filename: "payroll.csv", csv: "" };

  const staff = await prisma.staff.findMany({
    where: { salonId: salon.id },
    include: {
      Appointment: {
        where: {
          salonId: salon.id,
          date: { gte: filter.from, lte: filter.to },
          status: "COMPLETED",
        },
        include: { Invoice: true },
      },
      StaffService: true,
    },
    orderBy: { name: "asc" },
  });

  const rows = staff.map((s) => {
    const completedAppts = s.Appointment;
    const revenue = completedAppts.reduce(
      (sum, a) => sum + (a.Invoice?.total ?? 0),
      0
    );
    const commission = (revenue * s.commissionPct) / 100;

    return {
      staffId: s.id,
      name: s.name,
      phone: s.phone ?? "",
      commissionPct: s.commissionPct.toFixed(1),
      appointmentCount: completedAppts.length,
      periodFrom: filter.from,
      periodTo: filter.to,
      totalRevenue: revenue.toFixed(2),
      commission: commission.toFixed(2),
    };
  });

  return {
    filename: `payroll-${filter.from}-${filter.to}.csv`,
    csv: objectsToCSV(rows, [
      { key: "staffId", label: "Staff ID" },
      { key: "name", label: "Name" },
      { key: "phone", label: "Phone" },
      { key: "commissionPct", label: "Commission %" },
      { key: "appointmentCount", label: "Appointments" },
      { key: "periodFrom", label: "Period From" },
      { key: "periodTo", label: "Period To" },
      { key: "totalRevenue", label: "Revenue" },
      { key: "commission", label: "Commission" },
    ]),
  };
}

// ── Staff list ─────────────────────────────────────────────────────────────────

export async function exportStaff(): Promise<{ filename: string; csv: string }> {
  const salon = await prisma.salon.findFirst();
  if (!salon) return { filename: "staff.csv", csv: "" };

  const staff = await prisma.staff.findMany({
    where: { salonId: salon.id },
    include: { StaffService: { include: { Service: true } } },
    orderBy: { name: "asc" },
  });

  const rows = staff.map((s) => {
    const services = s.StaffService.map((ss) => ss.Service.name).join(" | ");
    return {
      id: s.id,
      name: s.name,
      phone: s.phone ?? "",
      commissionPct: s.commissionPct.toFixed(1),
      services,
      createdAt: s.createdAt.toISOString().split("T")[0],
    };
  });

  return {
    filename: `staff-${today()}.csv`,
    csv: objectsToCSV(rows, [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
      { key: "phone", label: "Phone" },
      { key: "commissionPct", label: "Commission %" },
      { key: "services", label: "Services" },
      { key: "createdAt", label: "Joined" },
    ]),
  };
}
