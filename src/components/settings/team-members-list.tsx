"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUserRole, deleteUser } from "@/app/actions/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { Users, Pencil, Trash2, Check, X } from "lucide-react";

type UserRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  createdAt: Date;
};

type Role = "OWNER" | "MANAGER" | "RECEPTIONIST" | "VIEWER";

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  OWNER:        { label: "Owner",        color: "bg-violet-400/10 text-violet-400 border-violet-400/30" },
  MANAGER:      { label: "Manager",      color: "bg-blue-400/10 text-blue-400 border-blue-400/30" },
  RECEPTIONIST: { label: "Receptionist", color: "bg-emerald-400/10 text-emerald-400 border-emerald-400/30" },
  VIEWER:       { label: "Viewer",       color: "bg-slate-400/10 text-slate-400 border-slate-400/30" },
};

interface TeamMembersListProps {
  users: UserRow[];
}

export function TeamMembersList({ users }: TeamMembersListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<Role>("RECEPTIONIST");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function startEdit(user: UserRow) {
    setEditingId(user.id);
    setEditRole(user.role as Role);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function saveRole() {
    if (!editingId) return;
    const id = editingId;
    startTransition(async () => {
      const result = await updateUserRole(id, editRole);
      if (result.success) {
        toast.success("Role updated");
        setEditingId(null);
        router.refresh();
      } else {
        toast.error("Failed to update role", result.error);
      }
    });
  }

  function confirmDelete(userId: string) {
    setDeletingId(userId);
  }

  function cancelDelete() {
    setDeletingId(null);
  }

  function handleDelete(userId: string) {
    startTransition(async () => {
      const result = await deleteUser(userId);
      if (result.success) {
        toast.success("Team member removed");
        setDeletingId(null);
        router.refresh();
      } else {
        toast.error("Failed to remove member", result.error);
      }
    });
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Team Members
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {users.length} member{users.length !== 1 ? "s" : ""}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No team members yet. Invite someone below.
          </p>
        ) : (
          <div className="space-y-1">
            {users.map((user) => {
              const roleInfo = ROLE_LABELS[user.role] ?? ROLE_LABELS.VIEWER;
              const isEditing = editingId === user.id;
              const isDeleting = deletingId === user.id;

              return (
                <div
                  key={user.id}
                  className="flex items-center gap-4 py-3 border-b border-border last:border-0"
                >
                  {/* Avatar letter */}
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0 select-none">
                    {user.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                    {user.email && (
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    )}
                  </div>

                  {/* Role — edit or badge */}
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Select value={editRole} onValueChange={(v) => v && setEditRole(v as Role)}>
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ROLE_LABELS).map(([value, { label }]) => (
                            <SelectItem key={value} value={value} className="text-xs">
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        onClick={saveRole}
                        disabled={isPending}
                        className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : isDeleting ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-destructive">Remove?</span>
                      <button
                        onClick={() => handleDelete(user.id)}
                        disabled={isPending}
                        className="px-2 py-1 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={cancelDelete}
                        className="px-2 py-1 rounded-lg bg-secondary text-muted-foreground text-xs hover:text-foreground transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleInfo.color}`}
                      >
                        {roleInfo.label}
                      </span>
                      <button
                        onClick={() => startEdit(user)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        title="Edit role"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => confirmDelete(user.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
