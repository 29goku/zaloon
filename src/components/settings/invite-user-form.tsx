"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUser } from "@/app/actions/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { UserPlus } from "lucide-react";

type Role = "OWNER" | "MANAGER" | "RECEPTIONIST" | "VIEWER";

const ROLES: { value: Role; label: string; description: string }[] = [
  { value: "OWNER",        label: "Owner",        description: "Full access" },
  { value: "MANAGER",      label: "Manager",      description: "Most access, no billing" },
  { value: "RECEPTIONIST", label: "Receptionist", description: "Appointments & payments" },
  { value: "VIEWER",       label: "Viewer",       description: "Read-only" },
];

export function InviteUserForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("RECEPTIONIST");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");

  function validate() {
    let ok = true;
    if (!name.trim()) {
      setNameError("Name is required");
      ok = false;
    } else {
      setNameError("");
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Invalid email address");
      ok = false;
    } else {
      setEmailError("");
    }
    return ok;
  }

  function handleInvite() {
    if (!validate()) return;
    startTransition(async () => {
      const result = await createUser({ name: name.trim(), email: email.trim(), role });
      if (result.success) {
        toast.success("Team member added", `${name} has been added as ${role}.`);
        setName("");
        setEmail("");
        setRole("RECEPTIONIST");
        router.refresh();
      } else {
        toast.error("Failed to add member", result.error);
      }
    });
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" />
          Add Team Member
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Name + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="mt-1 bg-secondary rounded-xl border-none px-4 py-3 h-auto text-sm"
              />
              {nameError && (
                <p className="text-destructive text-xs mt-1">{nameError}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Email
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="mt-1 bg-secondary rounded-xl border-none px-4 py-3 h-auto text-sm"
              />
              {emailError && (
                <p className="text-destructive text-xs mt-1">{emailError}</p>
              )}
            </div>
          </div>

          {/* Role */}
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Role
            </Label>
            <Select value={role} onValueChange={(v) => v && setRole(v as Role)}>
              <SelectTrigger className="mt-1 w-full bg-secondary rounded-xl border-none h-auto py-3 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <div className="flex items-center gap-2">
                      <span>{r.label}</span>
                      <span className="text-xs text-muted-foreground">— {r.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-1">
            <Button
              onClick={handleInvite}
              disabled={isPending}
              className="bg-primary text-primary-foreground px-5 py-2.5 h-auto rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              {isPending ? "Adding..." : "Add Member"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
