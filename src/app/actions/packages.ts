"use server";

import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { getCurrentSalonId } from "@/lib/repositories/base";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ServicePackage {
  id: string;
  name: string;
  description: string;
  services: Array<{ serviceId: string; qty: number }>;
  price: number;
  originalPrice: number;
  validityDays: number;
  isActive: boolean;
  sessions?: number;
  imageUrl?: string;
}

export interface ClientPackagePurchase {
  id: string;
  clientId: string;
  packageId: string;
  purchasedAt: string;
  sessionsRemaining: number;
  expiresAt: string;
  usageHistory: Array<{ appointmentId: string; redeemedAt: string }>;
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function getSalonWithBusinessHours() {
  const salonId = await getCurrentSalonId();
  const salon = await prisma.salon.findUniqueOrThrow({ where: { id: salonId } });

  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(salon.businessHours ?? "{}") as Record<string, unknown>;
  } catch {
    parsed = {};
  }

  return { salon, parsed };
}

function getPackagesFromParsed(parsed: Record<string, unknown>): ServicePackage[] {
  const raw = parsed.__packages;
  if (!Array.isArray(raw)) return [];
  return raw as ServicePackage[];
}

function getClientPackagesFromParsed(parsed: Record<string, unknown>): ClientPackagePurchase[] {
  const raw = parsed.__clientPackages;
  if (!Array.isArray(raw)) return [];
  return raw as ClientPackagePurchase[];
}

async function writeBusinessHours(salonId: string, parsed: Record<string, unknown>) {
  await prisma.salon.update({
    where: { id: salonId },
    data: { businessHours: JSON.stringify(parsed) },
  });
}

// ── getPackages ────────────────────────────────────────────────────────────

export async function getPackages(): Promise<ServicePackage[]> {
  const result = await getSalonWithBusinessHours();
  if (!result) return [];
  return getPackagesFromParsed(result.parsed);
}

// ── getPackageById ─────────────────────────────────────────────────────────

export async function getPackageById(id: string): Promise<ServicePackage | null> {
  const packages = await getPackages();
  return packages.find((p) => p.id === id) ?? null;
}

// ── createPackage ──────────────────────────────────────────────────────────

export async function createPackage(
  data: Omit<ServicePackage, "id">
): Promise<{ success: boolean; package?: ServicePackage; error?: string }> {
  try {
    const result = await getSalonWithBusinessHours();
    if (!result) return { success: false, error: "No salon found" };

    const { salon, parsed } = result;
    const packages = getPackagesFromParsed(parsed);

    const newPackage: ServicePackage = {
      id: randomUUID(),
      ...data,
    };

    packages.push(newPackage);
    parsed.__packages = packages;

    await writeBusinessHours(salon.id, parsed);

    return { success: true, package: newPackage };
  } catch (err) {
    console.error("[createPackage]", err);
    return { success: false, error: "Failed to create package" };
  }
}

// ── updatePackage ──────────────────────────────────────────────────────────

export async function updatePackage(
  id: string,
  data: Partial<ServicePackage>
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await getSalonWithBusinessHours();
    if (!result) return { success: false, error: "No salon found" };

    const { salon, parsed } = result;
    const packages = getPackagesFromParsed(parsed);

    const idx = packages.findIndex((p) => p.id === id);
    if (idx === -1) return { success: false, error: "Package not found" };

    packages[idx] = { ...packages[idx], ...data, id };
    parsed.__packages = packages;

    await writeBusinessHours(salon.id, parsed);

    return { success: true };
  } catch (err) {
    console.error("[updatePackage]", err);
    return { success: false, error: "Failed to update package" };
  }
}

// ── deletePackage ──────────────────────────────────────────────────────────

export async function deletePackage(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await getSalonWithBusinessHours();
    if (!result) return { success: false, error: "No salon found" };

    const { salon, parsed } = result;
    const packages = getPackagesFromParsed(parsed);

    const filtered = packages.filter((p) => p.id !== id);
    if (filtered.length === packages.length) {
      return { success: false, error: "Package not found" };
    }

    parsed.__packages = filtered;
    await writeBusinessHours(salon.id, parsed);

    return { success: true };
  } catch (err) {
    console.error("[deletePackage]", err);
    return { success: false, error: "Failed to delete package" };
  }
}

// ── purchasePackage ────────────────────────────────────────────────────────

export async function purchasePackage(
  clientId: string,
  packageId: string
): Promise<{ success: boolean; purchaseId?: string; error?: string }> {
  try {
    const result = await getSalonWithBusinessHours();
    if (!result) return { success: false, error: "No salon found" };

    const { salon, parsed } = result;
    const packages = getPackagesFromParsed(parsed);
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) return { success: false, error: "Package not found" };
    if (!pkg.isActive) return { success: false, error: "Package is not active" };

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return { success: false, error: "Client not found" };

    // Calculate total sessions
    const totalSessions =
      pkg.sessions ?? pkg.services.reduce((sum, s) => sum + s.qty, 0);

    // Expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + pkg.validityDays);

    const purchaseId = randomUUID();
    const now = new Date().toISOString();

    // Create the client package purchase entry
    const clientPackages = getClientPackagesFromParsed(parsed);
    const purchase: ClientPackagePurchase = {
      id: purchaseId,
      clientId,
      packageId,
      purchasedAt: now,
      sessionsRemaining: totalSessions,
      expiresAt: expiresAt.toISOString(),
      usageHistory: [],
    };
    clientPackages.push(purchase);
    parsed.__clientPackages = clientPackages;

    // Create an Invoice for the purchase
    const invoiceId = randomUUID();
    await prisma.invoice.create({
      data: {
        id: invoiceId,
        salonId: salon.id,
        clientId,
        total: pkg.price,
        discount: pkg.originalPrice - pkg.price,
        paymentMethod: "CASH",
        status: "PAID",
        note: `Package purchase: ${pkg.name}`,
        InvoiceItem: {
          create: [
            {
              id: randomUUID(),
              name: pkg.name,
              price: pkg.price,
              qty: 1,
            },
          ],
        },
      },
    });

    await writeBusinessHours(salon.id, parsed);

    return { success: true, purchaseId };
  } catch (err) {
    console.error("[purchasePackage]", err);
    return { success: false, error: "Failed to purchase package" };
  }
}

// ── getClientPackages ──────────────────────────────────────────────────────

export async function getClientPackages(clientId: string): Promise<
  Array<{
    purchase: ClientPackagePurchase;
    package: ServicePackage;
    sessionsRemaining: number;
    expiresAt: string;
  }>
> {
  const result = await getSalonWithBusinessHours();
  if (!result) return [];

  const { parsed } = result;
  const clientPackages = getClientPackagesFromParsed(parsed);
  const packages = getPackagesFromParsed(parsed);

  const clientPurchases = clientPackages.filter((cp) => cp.clientId === clientId);

  const results: Array<{
    purchase: ClientPackagePurchase;
    package: ServicePackage;
    sessionsRemaining: number;
    expiresAt: string;
  }> = [];

  for (const purchase of clientPurchases) {
    const pkg = packages.find((p) => p.id === purchase.packageId);
    if (!pkg) continue;

    results.push({
      purchase,
      package: pkg,
      sessionsRemaining: purchase.sessionsRemaining,
      expiresAt: purchase.expiresAt,
    });
  }

  return results;
}

// ── redeemPackageSession ───────────────────────────────────────────────────

export async function redeemPackageSession(
  purchaseId: string,
  appointmentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await getSalonWithBusinessHours();
    if (!result) return { success: false, error: "No salon found" };

    const { salon, parsed } = result;
    const clientPackages = getClientPackagesFromParsed(parsed);

    const idx = clientPackages.findIndex((cp) => cp.id === purchaseId);
    if (idx === -1) return { success: false, error: "Purchase not found" };

    const purchase = clientPackages[idx];

    if (purchase.sessionsRemaining <= 0) {
      return { success: false, error: "No sessions remaining" };
    }

    const now = new Date();
    if (now > new Date(purchase.expiresAt)) {
      return { success: false, error: "Package has expired" };
    }

    purchase.sessionsRemaining -= 1;
    purchase.usageHistory.push({
      appointmentId,
      redeemedAt: now.toISOString(),
    });

    clientPackages[idx] = purchase;
    parsed.__clientPackages = clientPackages;

    await writeBusinessHours(salon.id, parsed);

    return { success: true };
  } catch (err) {
    console.error("[redeemPackageSession]", err);
    return { success: false, error: "Failed to redeem session" };
  }
}
