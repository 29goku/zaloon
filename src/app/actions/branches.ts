"use server";

import { randomUUID } from "crypto";
import { getCurrentSalonId } from "@/lib/repositories/base";
import { readSalonBlob, writeSalonBlobKey } from "@/lib/repositories/salon";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface BranchHours {
  open: string;
  close: string;
  closed: boolean;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  manager?: string;       // free-text name
  isMain: boolean;
  isActive: boolean;
  staffIds: string[];     // staff assigned to this branch
  businessHours: Record<string, BranchHours>;
  timezone: string;
  active: boolean;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultHours(): Record<string, BranchHours> {
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const result: Record<string, BranchHours> = {};
  for (const day of days) {
    result[day] = { open: "09:00", close: "18:00", closed: day === "sunday" };
  }
  return result;
}

// ─── Public actions ───────────────────────────────────────────────────────────

export async function getBranches(): Promise<Branch[]> {
  const salonId = await getCurrentSalonId();
  const data = await readSalonBlob(salonId);
  const raw = data.__branches;
  if (!Array.isArray(raw)) return [];
  return raw as Branch[];
}

/** createBranch — spec signature */
export async function createBranch(
  data: Omit<Branch, "id" | "createdAt" | "isMain">
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const salonId = await getCurrentSalonId();
    const branches = await getBranches();
    const newBranch: Branch = {
      ...data,
      id: randomUUID(),
      isMain: branches.length === 0,
      staffIds: data.staffIds ?? [],
      businessHours: data.businessHours ?? defaultHours(),
      active: data.active ?? true,
      createdAt: new Date().toISOString(),
    };

    branches.push(newBranch);
    await writeSalonBlobKey(salonId, "__branches", branches);
    return { success: true, id: newBranch.id };
  } catch (err) {
    console.error("[createBranch]", err);
    return { success: false, error: "Failed to create branch" };
  }
}

/** saveBranch — legacy alias kept for existing BranchFormModal */
export async function saveBranch(
  branch: Omit<Branch, "id" | "createdAt">
): Promise<{ success: boolean; branch?: Branch; error?: string }> {
  const result = await createBranch({
    ...branch,
    staffIds: branch.staffIds ?? [],
    businessHours: branch.businessHours ?? defaultHours(),
    active: branch.active ?? true,
  });
  if (!result.success) return { success: false, error: result.error };
  const branches = await getBranches();
  const created = branches.find((b) => b.id === result.id);
  return { success: true, branch: created };
}

export async function updateBranch(
  id: string,
  data: Partial<Branch>
): Promise<{ success: boolean; error?: string }> {
  try {
    const salonId = await getCurrentSalonId();
    const branches = await getBranches();
    const idx = branches.findIndex((b) => b.id === id);
    if (idx === -1) return { success: false, error: "Branch not found" };

    // If setting isMain = true, demote others first
    if (data.isMain) {
      branches.forEach((b) => { b.isMain = false; });
    }

    branches[idx] = { ...branches[idx], ...data, id };
    await writeSalonBlobKey(salonId, "__branches", branches);
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
    const salonId = await getCurrentSalonId();
    const branches = await getBranches();
    const branch = branches.find((b) => b.id === id);
    if (!branch) return { success: false, error: "Branch not found" };
    if (branch.isMain) {
      return { success: false, error: "Cannot delete the main branch. Set another branch as main first." };
    }

    const updated = branches.filter((b) => b.id !== id);
    await writeSalonBlobKey(salonId, "__branches", updated);
    return { success: true };
  } catch (err) {
    console.error("[deleteBranch]", err);
    return { success: false, error: "Failed to delete branch" };
  }
}

export async function assignStaffToBranch(
  branchId: string,
  staffIds: string[]
): Promise<{ success: boolean; error?: string }> {
  return updateBranch(branchId, { staffIds });
}

export async function setMainBranch(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const salonId = await getCurrentSalonId();
    const branches = await getBranches();
    const exists = branches.some((b) => b.id === id);
    if (!exists) return { success: false, error: "Branch not found" };

    const updated = branches.map((b) => ({ ...b, isMain: b.id === id }));
    await writeSalonBlobKey(salonId, "__branches", updated);
    return { success: true };
  } catch (err) {
    console.error("[setMainBranch]", err);
    return { success: false, error: "Failed to set main branch" };
  }
}
