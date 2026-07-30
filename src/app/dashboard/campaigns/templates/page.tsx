import * as React from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, MessageSquare } from "lucide-react";

// ── Template data ──────────────────────────────────────────────────────────────

type TemplateCategory =
  | "Promotions"
  | "Re-engagement"
  | "Birthday"
  | "Seasonal"
  | "Announcements";

interface MessageTemplate {
  id: string;
  title: string;
  text: string;
  category: TemplateCategory;
}

const TEMPLATES: MessageTemplate[] = [
  // Promotions
  {
    id: "promo-weekend",
    title: "20% off this weekend",
    text: "Hi {name}! This weekend only — enjoy 20% off all services at Zaloon. Book your appointment today before slots fill up!",
    category: "Promotions",
  },
  {
    id: "promo-flash",
    title: "Flash sale today only",
    text: "Flash sale alert! Today only — Zaloon is offering exclusive deals on select services. Don't miss out, {name}. Book now!",
    category: "Promotions",
  },
  {
    id: "promo-valued",
    title: "Special offer for our valued clients",
    text: "Hi {name}, as one of our most valued clients, we have a special offer just for you. Visit us this week and save big. Call or book online!",
    category: "Promotions",
  },
  // Re-engagement
  {
    id: "reeng-miss",
    title: "We miss you! Come back for a complimentary treatment",
    text: "Hi {name}, we miss you! It's been a while since your last visit. Come back and enjoy a complimentary treatment on us. We'd love to see you again at Zaloon!",
    category: "Re-engagement",
  },
  {
    id: "reeng-while",
    title: "It's been a while...",
    text: "Hi {name}, it's been a while! We wanted to check in and let you know we have exciting new services waiting for you. Book your next appointment at Zaloon today.",
    category: "Re-engagement",
  },
  // Birthday
  {
    id: "bday-gift",
    title: "Happy Birthday! A special gift awaits",
    text: "Happy Birthday, {name}! To celebrate your special day, we have a gift waiting for you at Zaloon. Visit us this month and enjoy your birthday treat. Have a wonderful day!",
    category: "Birthday",
  },
  {
    id: "bday-discount",
    title: "Your birthday discount is here",
    text: "Hey {name}! Your birthday discount is ready — enjoy 15% off your next visit to Zaloon this month. It's our way of celebrating you. Book now!",
    category: "Birthday",
  },
  // Seasonal
  {
    id: "season-summer",
    title: "Summer special",
    text: "Summer is here, {name}! Beat the heat with our refreshing summer treatments at Zaloon. Book your seasonal package now and look and feel amazing all summer long.",
    category: "Seasonal",
  },
  {
    id: "season-holiday",
    title: "Holiday greetings",
    text: "Season's greetings, {name}! Wishing you joy and warmth this holiday season. Treat yourself or someone you love with a Zaloon gift card — the perfect gift!",
    category: "Seasonal",
  },
  // Announcements
  {
    id: "ann-service",
    title: "New service launch",
    text: "Exciting news, {name}! We've just launched a brand new service at Zaloon. Be among the first to try it — book now and experience the difference!",
    category: "Announcements",
  },
  {
    id: "ann-staff",
    title: "New staff member",
    text: "We're thrilled to welcome a new member to the Zaloon team! Book with our newest stylist and enjoy a fantastic experience. Slots are filling fast — reserve yours today.",
    category: "Announcements",
  },
  {
    id: "ann-hours",
    title: "Updated business hours",
    text: "Hi {name}, we wanted to let you know that Zaloon has updated its business hours. Please check our latest schedule before booking. We look forward to seeing you!",
    category: "Announcements",
  },
];

// ── Category badge colours ─────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  Promotions: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "Re-engagement": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  Birthday: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  Seasonal: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  Announcements: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

// ── Grouped by category ───────────────────────────────────────────────────────

const CATEGORY_ORDER: TemplateCategory[] = [
  "Promotions",
  "Re-engagement",
  "Birthday",
  "Seasonal",
  "Announcements",
];

// ── Sub-components ────────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: TemplateCategory }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${CATEGORY_COLORS[category]}`}
    >
      {category}
    </span>
  );
}

function TemplateCard({ template }: { template: MessageTemplate }) {
  const charCount = template.text.length;
  const useHref = `/dashboard/campaigns?template=${encodeURIComponent(template.text)}`;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3 hover:border-primary/50 hover:bg-primary/5 transition-colors group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <p className="text-sm font-semibold text-foreground truncate">{template.title}</p>
        </div>
        <CategoryBadge category={template.category} />
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
        {template.text}
      </p>

      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="text-xs text-muted-foreground tabular-nums">
          {charCount} chars
        </span>
        <Link
          href={useHref}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Use this template
        </Link>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const grouped = CATEGORY_ORDER.reduce<Record<TemplateCategory, MessageTemplate[]>>(
    (acc, cat) => {
      acc[cat] = TEMPLATES.filter((t) => t.category === cat);
      return acc;
    },
    {} as Record<TemplateCategory, MessageTemplate[]>
  );

  return (
    <div className="p-4 md:p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Campaigns
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          Message Templates
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Choose a pre-built template to get started. Click &ldquo;Use this template&rdquo; to open the campaign creator with the message pre-filled.
        </p>
      </div>

      {/* Grouped sections */}
      {CATEGORY_ORDER.map((category) => (
        <section key={category} className="space-y-3">
          <div className="flex items-center gap-2">
            <CategoryBadge category={category} />
            <span className="text-xs text-muted-foreground">
              {grouped[category].length} template{grouped[category].length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grouped[category].map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
