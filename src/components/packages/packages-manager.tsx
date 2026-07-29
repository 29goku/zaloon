"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package2, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  createPackage,
  updatePackage,
  deletePackage,
} from "@/app/actions/packages";
import type { ServicePackage } from "@/app/actions/packages";

interface ServiceStub {
  id: string;
  name: string;
  price: number;
  categoryName: string;
}

interface PackagesManagerProps {
  packages: ServicePackage[];
  services: ServiceStub[];
  fmt: (n: number) => string;
}

interface PackageServiceEntry {
  serviceId: string;
  qty: number;
}

interface PackageFormState {
  name: string;
  description: string;
  services: PackageServiceEntry[];
  price: string;
  validityDays: string;
  isActive: boolean;
  sessions: string;
  imageUrl: string;
}

const emptyForm = (): PackageFormState => ({
  name: "",
  description: "",
  services: [],
  price: "",
  validityDays: "90",
  isActive: true,
  sessions: "",
  imageUrl: "",
});

function calcOriginalPrice(entries: PackageServiceEntry[], services: ServiceStub[]) {
  return entries.reduce((sum, entry) => {
    const svc = services.find((s) => s.id === entry.serviceId);
    return sum + (svc?.price ?? 0) * entry.qty;
  }, 0);
}

function calcSavingsPct(original: number, pkg: number): number {
  if (original <= 0) return 0;
  return Math.round(((original - pkg) / original) * 100);
}

export function PackagesManager({ packages, services, fmt }: PackagesManagerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServicePackage | null>(null);
  const [form, setForm] = useState<PackageFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setError(null);
    setOpen(true);
  }

  function openEdit(pkg: ServicePackage) {
    setEditing(pkg);
    setForm({
      name: pkg.name,
      description: pkg.description,
      services: pkg.services,
      price: String(pkg.price),
      validityDays: String(pkg.validityDays),
      isActive: pkg.isActive,
      sessions: pkg.sessions != null ? String(pkg.sessions) : "",
      imageUrl: pkg.imageUrl ?? "",
    });
    setError(null);
    setOpen(true);
  }

  function addService(serviceId: string) {
    if (!serviceId) return;
    setForm((prev) => {
      if (prev.services.some((s) => s.serviceId === serviceId)) return prev;
      return { ...prev, services: [...prev.services, { serviceId, qty: 1 }] };
    });
  }

  function removeService(serviceId: string) {
    setForm((prev) => ({
      ...prev,
      services: prev.services.filter((s) => s.serviceId !== serviceId),
    }));
  }

  function updateQty(serviceId: string, qty: number) {
    setForm((prev) => ({
      ...prev,
      services: prev.services.map((s) =>
        s.serviceId === serviceId ? { ...s, qty: Math.max(1, qty) } : s
      ),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Name is required");
    if (form.services.length === 0) return setError("Add at least one service");
    const priceNum = parseFloat(form.price);
    if (isNaN(priceNum) || priceNum < 0) return setError("Enter a valid price");

    const originalPrice = calcOriginalPrice(form.services, services);
    const validityDays = parseInt(form.validityDays) || 90;
    const sessions = form.sessions ? parseInt(form.sessions) || undefined : undefined;

    const data: Omit<ServicePackage, "id"> = {
      name: form.name.trim(),
      description: form.description.trim(),
      services: form.services,
      price: priceNum,
      originalPrice,
      validityDays,
      isActive: form.isActive,
      sessions,
      imageUrl: form.imageUrl.trim() || undefined,
    };

    setSaving(true);
    setError(null);

    try {
      if (editing) {
        const res = await updatePackage(editing.id, data);
        if (!res.success) return setError(res.error ?? "Failed to save");
      } else {
        const res = await createPackage(data);
        if (!res.success) return setError(res.error ?? "Failed to save");
      }
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(pkg: ServicePackage) {
    await updatePackage(pkg.id, { isActive: !pkg.isActive });
    router.refresh();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deletePackage(id);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  const originalPrice = calcOriginalPrice(form.services, services);
  const pkgPrice = parseFloat(form.price) || 0;
  const savingsPct = calcSavingsPct(originalPrice, pkgPrice);

  return (
    <div>
      {/* Header action */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Service Packages</h1>
          <p className="text-muted-foreground mt-1">
            {packages.length} package{packages.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Create package
        </Button>
      </div>

      {/* Empty state */}
      {packages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Package2 className="w-14 h-14 text-muted-foreground mb-4 opacity-40" />
          <p className="text-foreground font-semibold text-lg mb-1">No packages yet</p>
          <p className="text-muted-foreground text-sm mb-6">
            Create bundled packages to offer clients discounted service combinations.
          </p>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Create your first package
          </Button>
        </div>
      )}

      {/* Package grid */}
      {packages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {packages.map((pkg) => {
            const savings = calcSavingsPct(pkg.originalPrice, pkg.price);
            const totalSessions =
              pkg.sessions ?? pkg.services.reduce((s, e) => s + e.qty, 0);

            return (
              <div
                key={pkg.id}
                className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 hover:border-primary/30 transition-colors"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-foreground text-base leading-tight truncate">
                        {pkg.name}
                      </h3>
                      {!pkg.isActive && (
                        <Badge className="bg-muted text-muted-foreground border-0 text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    {pkg.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {pkg.description}
                      </p>
                    )}
                  </div>
                  {savings > 0 && (
                    <span className="flex-shrink-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-500/25">
                      Save {savings}%
                    </span>
                  )}
                </div>

                {/* Included services */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Included services
                  </p>
                  <div className="space-y-1">
                    {pkg.services.map((entry) => {
                      const svc = services.find((s) => s.id === entry.serviceId);
                      return (
                        <div
                          key={entry.serviceId}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-foreground">
                            {svc?.name ?? entry.serviceId}
                          </span>
                          <span className="text-muted-foreground">
                            ×{entry.qty}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pricing */}
                <div className="flex items-end gap-3">
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {fmt(pkg.price)}
                    </p>
                    {pkg.originalPrice > pkg.price && (
                      <p className="text-sm text-muted-foreground line-through">
                        {fmt(pkg.originalPrice)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Sessions + validity */}
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span className="bg-secondary rounded-lg px-2.5 py-1">
                    {totalSessions} session{totalSessions !== 1 ? "s" : ""}
                  </span>
                  <span className="bg-secondary rounded-lg px-2.5 py-1">
                    Valid {pkg.validityDays} days
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <button
                    onClick={() => handleToggleActive(pkg)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {pkg.isActive ? (
                      <ToggleRight className="w-4 h-4 text-primary" />
                    ) : (
                      <ToggleLeft className="w-4 h-4" />
                    )}
                    {pkg.isActive ? "Active" : "Inactive"}
                  </button>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => openEdit(pkg)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(pkg.id)}
                      disabled={deletingId === pkg.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Package" : "Create Package"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="pkg-name">Name</Label>
              <Input
                id="pkg-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Glow Bundle"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="pkg-desc">Description</Label>
              <Input
                id="pkg-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Short description"
              />
            </div>

            {/* Services */}
            <div className="space-y-2">
              <Label>Included Services</Label>

              {/* Service selector */}
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                defaultValue=""
                onChange={(e) => {
                  addService(e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="" disabled>
                  Add a service...
                </option>
                {services.map((svc) => (
                  <option key={svc.id} value={svc.id}>
                    {svc.categoryName} – {svc.name} ({fmt(svc.price)})
                  </option>
                ))}
              </select>

              {/* Selected services */}
              {form.services.length > 0 && (
                <div className="space-y-2 mt-2">
                  {form.services.map((entry) => {
                    const svc = services.find((s) => s.id === entry.serviceId);
                    return (
                      <div
                        key={entry.serviceId}
                        className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2"
                      >
                        <span className="flex-1 text-sm text-foreground truncate">
                          {svc?.name ?? entry.serviceId}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="w-6 h-6 rounded bg-border hover:bg-border/80 text-xs font-bold"
                            onClick={() => updateQty(entry.serviceId, entry.qty - 1)}
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm font-medium">
                            {entry.qty}
                          </span>
                          <button
                            type="button"
                            className="w-6 h-6 rounded bg-border hover:bg-border/80 text-xs font-bold"
                            onClick={() => updateQty(entry.serviceId, entry.qty + 1)}
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeService(entry.serviceId)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Original price preview */}
              {originalPrice > 0 && (
                <p className="text-xs text-muted-foreground">
                  Total retail value: {fmt(originalPrice)}
                </p>
              )}
            </div>

            {/* Package price */}
            <div className="space-y-1.5">
              <Label htmlFor="pkg-price">Package Price</Label>
              <div className="relative">
                <Input
                  id="pkg-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                  placeholder="0.00"
                />
                {savingsPct > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-500">
                    Save {savingsPct}%
                  </span>
                )}
              </div>
            </div>

            {/* Validity days */}
            <div className="space-y-1.5">
              <Label htmlFor="pkg-validity">Validity (days)</Label>
              <Input
                id="pkg-validity"
                type="number"
                min={1}
                value={form.validityDays}
                onChange={(e) =>
                  setForm((p) => ({ ...p, validityDays: e.target.value }))
                }
                placeholder="90"
              />
            </div>

            {/* Sessions override */}
            <div className="space-y-1.5">
              <Label htmlFor="pkg-sessions">
                Sessions override{" "}
                <span className="text-muted-foreground font-normal">
                  (leave blank to use sum of qty)
                </span>
              </Label>
              <Input
                id="pkg-sessions"
                type="number"
                min={1}
                value={form.sessions}
                onChange={(e) =>
                  setForm((p) => ({ ...p, sessions: e.target.value }))
                }
                placeholder="auto"
              />
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label htmlFor="pkg-active" className="cursor-pointer">
                Active
              </Label>
              <Switch
                id="pkg-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save changes" : "Create package"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
