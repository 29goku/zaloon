"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  isMain: boolean;
  isActive: boolean;
  timezone: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function readBusinessHours(): Promise<Record<string, unknown>> {
  const salon = await prisma.salon.findFirst({ select: { businessHours: true } });
  if (!salon?.businessHours) return {};
  try {
    const parsed = JSON.parse(salon.businessHours);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    // Legacy plain array — promote to keyed object
    return { __hours: parsed };
  } catch {
    return {};
  }
}

async function writeBusinessHours(
  patch: Record<string, unknown>
): Promise<void> {
  const salon = await prisma.salon.findFirst();
  if (!salon) return;
  const existing = await readBusinessHours();
  const merged = { ...existing, ...patch };
  await prisma.salon.update({
    where: { id: salon.id },
    data: { updatedAt: new Date(), businessHours: JSON.stringify(merged) },
  });
}

// ─── Public actions ───────────────────────────────────────────────────────────

export async function getBranches(): Promise<Branch[]> {
  const data = await readBusinessHours();
  const raw = data.__branches;
  if (!Array.isArray(raw)) return [];
  return raw as Branch[];
}

export async function saveBranch(
  branch: Omit<Branch, "id">
): Promise<{ success: boolean; branch?: Branch; error?: string }> {
  try {
    const branches = await getBranches();
    const newBranch: Branch = { ...branch, id: randomUUID() };

    // If this is the first branch, make it the main one
    if (branches.length === 0) {
      newBranch.isMain = true;
    }

    // If explicitly marked as main, demote all others
    if (newBranch.isMain) {
      branches.forEach((b) => { b.isMain = false; });
    }

    branches.push(newBranch);
    await writeBusinessHours({ __branches: branches });
    return { success: true, branch: newBranch };
  } catch (err) {
    console.error("[saveBranch]", err);
    return { success: false, error: "Failed to save branch" };
  }
}

export async function updateBranch(
  id: string,
  data: Partial<Branch>
): Promise<{ success: boolean; error?: string }> {
  try {
    const branches = await getBranches();
    const idx = branches.findIndex((b) => b.id === id);
    if (idx === -1) return { success: false, error: "Branch not found" };

    // If setting isMain = true, demote others first
    if (data.isMain) {
      branches.forEach((b) => { b.isMain = false; });
    }

    branches[idx] = { ...branches[idx], ...data, id };
    await writeBusinessHours({ __branches: branches });
    return { success: true };
  } catch (err) {
    console.error("[updateBranch]", err);
    return { success: false, error: "Failed to update branch" };
  }
}

export async function deleteBranch(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const branches = await getBranches();
    const branch = branches.find((b) => b.id === id);
    if (!branch) return { success: false, error: "Branch not found" };
    if (branch.isMain) {
      return { success: false, error: "Cannot delete the main branch. Set another branch as main first." };
    }

    const updated = branches.filter((b) => b.id !== id);
    await writeBusinessHours({ __branches: updated });
    return { success: true };
  } catch (err) {
    console.error("[deleteBranch]", err);
    return { success: false, error: "Failed to delete branch" };
  }
}

export async function setMainBranch(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const branches = await getBranches();
    const exists = branches.some((b) => b.id === id);
    if (!exists) return { success: false, error: "Branch not found" };

    const updated = branches.map((b) => ({ ...b, isMain: b.id === id }));
    await writeBusinessHours({ __branches: updated });
    return { success: true };
  } catch (err) {
    console.error("[setMainBranch]", err);
    return { success: false, error: "Failed to set main branch" };
  }
}
