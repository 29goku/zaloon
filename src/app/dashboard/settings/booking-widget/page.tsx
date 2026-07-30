import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code2, ExternalLink, QrCode, Palette } from "lucide-react";
import { BookingWidgetPanel } from "@/components/settings/booking-widget-panel";

export const dynamic = "force-dynamic";

export default async function BookingWidgetPage() {
  const salon = await prisma.salon.findFirst({
    select: { slug: true, name: true },
  });

  if (!salon?.slug) {
    return (
      <div className="p-4 md:p-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Code2 className="w-7 h-7 text-primary" />
          Booking Widget
        </h1>
        <p className="text-muted-foreground mt-4">
          Your salon needs a booking URL slug before you can embed the widget. Configure it in{" "}
          <a href="/dashboard/settings" className="text-primary underline underline-offset-4">
            General Settings
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Code2 className="w-7 h-7 text-primary" />
          Booking Widget
        </h1>
        <p className="text-muted-foreground mt-1">
          Embed a &ldquo;Book Now&rdquo; button on any website
        </p>
      </div>

      <BookingWidgetPanel slug={salon.slug} salonName={salon.name} />
    </div>
  );
}
