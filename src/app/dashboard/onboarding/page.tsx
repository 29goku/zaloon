import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Scissors,
  Users,
  Sparkles,
  CalendarDays,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const [staffCount, serviceCount, clientCount] = await Promise.all([
    prisma.staff.count(),
    prisma.service.count(),
    prisma.client.count(),
  ]);

  const salon = await prisma.salon.findFirst();

  const steps = [
    {
      id: "staff",
      title: "Set up your team",
      description:
        "Add your stylists and therapists so you can assign appointments and track performance.",
      icon: Users,
      href: "/dashboard/staff",
      cta: "Add staff members",
      done: staffCount > 0,
      doneLabel: `${staffCount} staff member${staffCount !== 1 ? "s" : ""} added`,
    },
    {
      id: "services",
      title: "Add your services",
      description:
        "Create the services you offer — haircuts, facials, nail treatments, and more — with pricing and duration.",
      icon: Scissors,
      href: "/dashboard/services",
      cta: "Add services",
      done: serviceCount > 0,
      doneLabel: `${serviceCount} service${serviceCount !== 1 ? "s" : ""} added`,
    },
    {
      id: "clients",
      title: "Import your clients",
      description:
        "Add your existing client list with names, phone numbers, and birthdays.",
      icon: Sparkles,
      href: "/dashboard/clients",
      cta: "Add clients",
      done: clientCount > 0,
      doneLabel: `${clientCount} client${clientCount !== 1 ? "s" : ""} added`,
    },
    {
      id: "appointments",
      title: "Book your first appointment",
      description:
        "Once staff and services are set up, start scheduling appointments for your clients.",
      icon: CalendarDays,
      href: "/dashboard/appointments",
      cta: "View calendar",
      done: false,
      doneLabel: "",
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.filter((s) => s.id !== "appointments").length;

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <p className="text-sm font-medium text-primary uppercase tracking-widest mb-2">
          Getting started
        </p>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome to {salon?.name ?? "Style Studio"} 👋
        </h1>
        <p className="text-muted-foreground mt-2 text-base">
          Complete the steps below to get your salon up and running.
        </p>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {completedCount} of {steps.length - 1} setup steps completed
            </span>
            {allDone && (
              <span className="text-sm font-medium text-primary flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Setup complete
              </span>
            )}
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{
                width: `${(completedCount / (steps.length - 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Step cards */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Card
              key={step.id}
              className={`border-border bg-card transition-all ${
                step.done ? "opacity-75" : "hover:border-primary/40"
              }`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3 text-base font-semibold">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      step.done
                        ? "bg-primary/20 text-primary"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {step.done ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={step.done ? "line-through text-muted-foreground" : ""}>
                    {step.title}
                  </span>
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    Step {index + 1}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 pl-12">
                  {step.done ? step.doneLabel : step.description}
                </p>
                <div className="pl-12">
                  <Link
                    href={step.href}
                    className={cn(
                      buttonVariants({
                        variant: step.done ? "outline" : "default",
                        size: "sm",
                      }),
                      "inline-flex items-center gap-2"
                    )}
                  >
                    {step.done ? "View" : step.cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Skip link */}
      {!allDone && (
        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
          >
            Skip setup and go to dashboard
          </Link>
        </div>
      )}

      {allDone && (
        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ size: "lg" }),
              "inline-flex items-center gap-2"
            )}
          >
            Go to dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
