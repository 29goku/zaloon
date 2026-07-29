import Link from "next/link";
import {
  UserCircle,
  Users,
  Scissors,
  CalendarDays,
  Receipt,
  Tag,
  Gift,
  Search,
  Package,
} from "lucide-react";
import { globalSearchItems, type ResultType, type SearchResultItem } from "@/app/actions/search";

export const dynamic = "force-dynamic";

// ─── helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_ORDER: ResultType[] = [
  "client",
  "staff",
  "service",
  "appointment",
  "invoice",
  "coupon",
  "giftCard",
  "inventory",
];

const CATEGORY_LABEL: Record<ResultType, string> = {
  client: "Clients",
  staff: "Staff",
  service: "Services",
  appointment: "Appointments",
  invoice: "Invoices",
  coupon: "Coupons",
  giftCard: "Gift Cards",
  inventory: "Inventory",
};

const CATEGORY_ICON: Record<ResultType, React.ElementType> = {
  client: UserCircle,
  staff: Users,
  service: Scissors,
  appointment: CalendarDays,
  invoice: Receipt,
  coupon: Tag,
  giftCard: Gift,
  inventory: Package,
};

// ─── page ─────────────────────────────────────────────────────────────────────

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  // Fetch with a higher limit than the palette (20 per type)
  const items = query ? await globalSearchItems(query, 20) : [];

  // Group by type
  const grouped: { type: ResultType; items: SearchResultItem[] }[] =
    CATEGORY_ORDER.map((type) => ({
      type,
      items: items.filter((i) => i.type === type),
    })).filter((g) => g.items.length > 0);

  const totalCount = items.length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">
          {query ? (
            <>
              Results for{" "}
              <span className="text-primary">&ldquo;{query}&rdquo;</span>
            </>
          ) : (
            "Search"
          )}
        </h1>
        {query && (
          <p className="mt-1 text-sm text-muted-foreground">
            {totalCount === 0
              ? "No results found"
              : `${totalCount} result${totalCount === 1 ? "" : "s"} across ${grouped.length} categor${grouped.length === 1 ? "y" : "ies"}`}
          </p>
        )}
      </div>

      {/* Empty / no-query states */}
      {!query && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Search className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Use{" "}
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              ⌘K
            </kbd>{" "}
            or the search bar to find anything in Zaloon
          </p>
        </div>
      )}

      {query && totalCount === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Search className="size-5 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">
            No results for &ldquo;{query}&rdquo;
          </p>
          <p className="text-sm text-muted-foreground">
            Try searching by name, phone number, invoice ID, coupon code, or gift card code
          </p>
        </div>
      )}

      {/* Grouped results */}
      {grouped.length > 0 && (
        <div className="space-y-8">
          {grouped.map(({ type, items: groupItems }) => {
            const Icon = CATEGORY_ICON[type];
            return (
              <section key={type}>
                {/* Section header */}
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">
                    {CATEGORY_LABEL[type]}
                  </h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    {groupItems.length}
                  </span>
                </div>

                {/* Result rows */}
                <div className="overflow-hidden rounded-lg border border-border bg-card divide-y divide-border">
                  {groupItems.map((item) => (
                    <ResultCard key={item.id} item={item} query={query} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Result card ──────────────────────────────────────────────────────────────

function ResultCard({
  item,
  query,
}: {
  item: SearchResultItem;
  query: string;
}) {
  const Icon = CATEGORY_ICON[item.type];
  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-accent/50"
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-foreground">
          <HighlightMatch text={item.title} query={query} />
        </span>
        {item.subtitle && (
          <span className="block truncate text-xs text-muted-foreground">
            {item.subtitle}
          </span>
        )}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">→</span>
    </Link>
  );
}

// ─── Highlight matching substring ─────────────────────────────────────────────

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-primary/20 text-primary not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}
