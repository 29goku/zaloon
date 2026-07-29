import { prisma } from "@/lib/prisma";
import { Star, Users, TrendingUp, MessageSquare } from "lucide-react";
import Link from "next/link";
import { DeleteReviewButton, CopyReviewLink, ReviewResponseButton, VisibilityToggle } from "./review-actions";
import { ReviewSortSelect } from "./sort-select";
import { parseReviewContent } from "@/lib/review-utils";

export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className={`w-3.5 h-3.5 ${
            i <= rating
              ? "text-amber-400 fill-amber-400"
              : "text-muted-foreground/20 fill-muted-foreground/20"
          }`}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const REVIEWS_PER_PAGE = 10;

// ─── Page props ───────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{
    staffId?: string;
    tab?: string;
    filter?: string;
    sort?: string;
    page?: string;
  }>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReviewsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const staffIdFilter = params.staffId ?? undefined;
  const activeTab = params.tab === "staff" ? "staff" : "reviews";
  const filterMode = params.filter ?? "all";
  const sortMode = params.sort ?? "newest";
  const currentPage = Math.max(1, parseInt(params.page ?? "1"));

  const salon = await prisma.salon.findFirst({ select: { slug: true } });
  const salonSlug = salon?.slug ?? "";

  // ── Parallel data fetches ──────────────────────────────────────────────────
  const [allReviewsRaw, staffList] = await Promise.all([
    prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        Client: { select: { id: true, name: true } },
        Staff: { select: { id: true, name: true } },
      },
    }),
    prisma.staff.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  // ── Enrich reviews with parsed content ────────────────────────────────────
  const allReviews = allReviewsRaw.map((r) => ({
    ...r,
    parsed: parseReviewContent(r.comment),
  }));

  const totalReviews = allReviews.length;

  // ── Stats ─────────────────────────────────────────────────────────────────
  const avgRating =
    totalReviews > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : null;

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const reviewsThisMonth = allReviews.filter((r) => new Date(r.createdAt) >= firstOfMonth).length;

  const reviewsWithResponse = allReviews.filter((r) => r.parsed.salonResponse !== null).length;
  const responseRate =
    totalReviews > 0 ? Math.round((reviewsWithResponse / totalReviews) * 100) : 0;

  // ── Rating distribution ───────────────────────────────────────────────────
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of allReviews) {
    distribution[r.rating] = (distribution[r.rating] ?? 0) + 1;
  }
  const maxDistCount = Math.max(...Object.values(distribution), 1);

  // ── Staff performance data ────────────────────────────────────────────────
  type StaffRow = {
    id: string;
    name: string;
    avgRating: number | null;
    reviewCount: number;
    lastReviewDate: Date | null;
  };

  const staffPerformance: StaffRow[] = staffList.map((staff) => {
    const staffRevs = allReviews.filter((r) => r.staffId === staff.id);
    const avgR =
      staffRevs.length > 0
        ? staffRevs.reduce((sum, r) => sum + r.rating, 0) / staffRevs.length
        : null;
    const lastReviewDate =
      staffRevs.length > 0
        ? staffRevs.reduce<Date | null>((latest, r) => {
            const d = new Date(r.createdAt);
            return !latest || d > latest ? d : latest;
          }, null)
        : null;
    return { id: staff.id, name: staff.name, avgRating: avgR, reviewCount: staffRevs.length, lastReviewDate };
  });

  staffPerformance.sort((a, b) => {
    if (a.avgRating === null && b.avgRating === null) return 0;
    if (a.avgRating === null) return 1;
    if (b.avgRating === null) return -1;
    return b.avgRating - a.avgRating;
  });

  // ── Pending responses ─────────────────────────────────────────────────────
  const pendingResponses = allReviews
    .filter((r) => r.parsed.salonResponse === null && !r.parsed.isFlagged)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // ── All reviews with filter + sort + pagination ───────────────────────────
  let filteredReviews = [...allReviews];

  if (staffIdFilter) {
    filteredReviews = filteredReviews.filter((r) => r.staffId === staffIdFilter);
  }

  switch (filterMode) {
    case "5":
      filteredReviews = filteredReviews.filter((r) => r.rating === 5);
      break;
    case "4":
      filteredReviews = filteredReviews.filter((r) => r.rating === 4);
      break;
    case "3":
      filteredReviews = filteredReviews.filter((r) => r.rating === 3);
      break;
    case "low":
      filteredReviews = filteredReviews.filter((r) => r.rating <= 2);
      break;
    case "no-response":
      filteredReviews = filteredReviews.filter((r) => r.parsed.salonResponse === null);
      break;
  }

  switch (sortMode) {
    case "oldest":
      filteredReviews.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      break;
    case "rating-high":
      filteredReviews.sort((a, b) => b.rating - a.rating);
      break;
    case "rating-low":
      filteredReviews.sort((a, b) => a.rating - b.rating);
      break;
    default: // newest
      filteredReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE));
  const paginatedReviews = filteredReviews.slice(
    (currentPage - 1) * REVIEWS_PER_PAGE,
    currentPage * REVIEWS_PER_PAGE
  );

  // ── URL builder ───────────────────────────────────────────────────────────
  function buildUrl(newParams: Record<string, string | undefined>) {
    const merged: Record<string, string> = {};
    if (staffIdFilter) merged.staffId = staffIdFilter;
    if (activeTab === "staff") merged.tab = "staff";
    if (filterMode !== "all") merged.filter = filterMode;
    if (sortMode !== "newest") merged.sort = sortMode;
    if (currentPage > 1) merged.page = String(currentPage);
    Object.entries(newParams).forEach(([k, v]) => {
      if (v === undefined || v === "") {
        delete merged[k];
      } else {
        merged[k] = v;
      }
    });
    const qs = new URLSearchParams(merged).toString();
    return `/dashboard/reviews${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
          Reviews
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage client feedback and respond to reviews
        </p>
      </div>

      {/* ─── Stats row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Average rating */}
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <Star className="w-3.5 h-3.5" />
            Average Rating
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-foreground leading-none">
              {avgRating !== null ? avgRating.toFixed(1) : "—"}
            </span>
            <div className="flex gap-0.5 mb-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <svg
                  key={i}
                  viewBox="0 0 24 24"
                  className={`w-3.5 h-3.5 ${
                    avgRating !== null && i <= Math.round(avgRating)
                      ? "text-amber-400 fill-amber-400"
                      : "text-muted-foreground/20 fill-muted-foreground/20"
                  }`}
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
          </div>
        </div>

        {/* Total reviews */}
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <Users className="w-3.5 h-3.5" />
            Total Reviews
          </div>
          <span className="text-3xl font-bold text-foreground leading-none">{totalReviews}</span>
        </div>

        {/* This month */}
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            This Month
          </div>
          <span className="text-3xl font-bold text-foreground leading-none">{reviewsThisMonth}</span>
        </div>

        {/* Response rate */}
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <MessageSquare className="w-3.5 h-3.5" />
            Response Rate
          </div>
          <div className="flex items-end gap-1.5">
            <span className="text-3xl font-bold text-foreground leading-none">{responseRate}%</span>
            <span className="text-xs text-muted-foreground mb-0.5">
              ({reviewsWithResponse}/{totalReviews})
            </span>
          </div>
        </div>
      </div>

      {/* ─── Rating Distribution (pure SVG bars) ─────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-semibold text-foreground mb-4">Rating Distribution</p>
        <div className="space-y-2.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[star] ?? 0;
            const barWidthPct = maxDistCount > 0 ? (count / maxDistCount) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-12 shrink-0">
                  <span className="text-xs font-medium text-muted-foreground w-3 text-right">{star}</span>
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <svg width="100%" height="12" className="overflow-visible">
                    <rect x="0" y="2" width="100%" height="8" rx="4" className="fill-muted" />
                    <rect
                      x="0"
                      y="2"
                      width={`${barWidthPct}%`}
                      height="8"
                      rx="4"
                      className="fill-amber-400"
                    />
                  </svg>
                </div>
                <span className="text-xs text-muted-foreground w-6 text-right shrink-0">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-border">
        <Link
          href={buildUrl({ tab: undefined })}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "reviews"
              ? "bg-card border border-b-card border-border text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Reviews
        </Link>
        <Link
          href={buildUrl({ tab: "staff" })}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "staff"
              ? "bg-card border border-b-card border-border text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Staff Performance
        </Link>
      </div>

      {/* ─── Reviews tab ─────────────────────────────────────────────────── */}
      {activeTab === "reviews" && (
        <div className="space-y-8">
          {/* ── Pending responses section ─────────────────────────────────── */}
          {pendingResponses.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">Pending Responses</h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 text-xs font-semibold border border-amber-200 dark:border-amber-800">
                  {pendingResponses.length}
                </span>
              </div>
              <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
                {pendingResponses.slice(0, 5).map((review) => {
                  const firstName = review.Client?.name?.split(" ")[0] ?? "Anonymous";
                  return (
                    <div
                      key={review.id}
                      className="p-4 sm:p-5 flex items-start gap-4 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{firstName}</span>
                          {review.Staff && (
                            <span className="text-xs text-muted-foreground">
                              for <span className="font-medium">{review.Staff.name}</span>
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDate(review.createdAt)}
                          </span>
                        </div>
                        <StarRow rating={review.rating} />
                        {review.parsed.clientComment && (
                          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2">
                            {review.parsed.clientComment}
                          </p>
                        )}
                      </div>
                      <ReviewResponseButton
                        reviewId={review.id}
                        clientName={review.Client?.name ?? "Anonymous"}
                        rating={review.rating}
                        clientComment={review.parsed.clientComment}
                        staffName={review.Staff?.name ?? null}
                        date={formatDate(review.createdAt)}
                        existingResponse={null}
                      />
                    </div>
                  );
                })}
              </div>
              {pendingResponses.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  +{pendingResponses.length - 5} more — use &quot;No response&quot; filter below to see all.
                </p>
              )}
            </section>
          )}

          {/* ── All reviews section ───────────────────────────────────────── */}
          <section className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">All Reviews</h2>

            {/* Filter + sort bar */}
            <div className="flex flex-wrap gap-3 items-center justify-between">
              {/* Filter chips */}
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["all", "All"],
                    ["5", "5★"],
                    ["4", "4★"],
                    ["3", "3★"],
                    ["low", "1-2★"],
                    ["no-response", "No response"],
                  ] as [string, string][]
                ).map(([value, label]) => (
                  <Link
                    key={value}
                    href={buildUrl({ filter: value === "all" ? undefined : value, page: undefined })}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      filterMode === value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </div>

              {/* Sort select */}
              <ReviewSortSelect
                defaultValue={sortMode}
                staffIdFilter={staffIdFilter ?? undefined}
                filterMode={filterMode}
              />
            </div>

            {/* Reviews list */}
            {paginatedReviews.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No reviews match this filter.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
                {paginatedReviews.map((review) => {
                  const { clientComment, salonResponse, isFlagged } = review.parsed;
                  return (
                    <div
                      key={review.id}
                      className={`p-4 sm:p-5 hover:bg-muted/20 transition-colors ${isFlagged ? "border-l-2 border-destructive" : ""}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {review.Client?.name ?? "Anonymous"}
                            </span>
                            {review.Staff && (
                              <span className="text-xs text-muted-foreground">
                                for <span className="font-medium">{review.Staff.name}</span>
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                review.isPublic
                                  ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {review.isPublic ? "Public" : "Private"}
                            </span>
                            {isFlagged && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/10 text-destructive">
                                Flagged
                              </span>
                            )}
                          </div>
                          <StarRow rating={review.rating} />
                          {clientComment && (
                            <p className="text-sm text-foreground/80 leading-relaxed">
                              {clientComment}
                            </p>
                          )}
                          {salonResponse && (
                            <div className="mt-2 pl-3 border-l-2 border-primary/30">
                              <p className="text-xs font-semibold text-primary mb-0.5">Owner response</p>
                              <p className="text-xs text-foreground/70 leading-relaxed">{salonResponse}</p>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <ReviewResponseButton
                            reviewId={review.id}
                            clientName={review.Client?.name ?? "Anonymous"}
                            rating={review.rating}
                            clientComment={clientComment}
                            staffName={review.Staff?.name ?? null}
                            date={formatDate(review.createdAt)}
                            existingResponse={salonResponse}
                          />
                          <VisibilityToggle
                            reviewId={review.id}
                            isPublic={review.isPublic}
                          />
                          <DeleteReviewButton id={review.id} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages} ({filteredReviews.length} reviews)
                </p>
                <div className="flex gap-2">
                  {currentPage > 1 && (
                    <Link
                      href={buildUrl({ page: currentPage === 2 ? undefined : String(currentPage - 1) })}
                      className="px-3 py-1.5 text-xs rounded-lg border border-border bg-card hover:bg-muted/50 text-foreground transition-colors"
                    >
                      Previous
                    </Link>
                  )}
                  {currentPage < totalPages && (
                    <Link
                      href={buildUrl({ page: String(currentPage + 1) })}
                      className="px-3 py-1.5 text-xs rounded-lg border border-border bg-card hover:bg-muted/50 text-foreground transition-colors"
                    >
                      Next
                    </Link>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ── Review request links ───────────────────────────────────────── */}
          <ReviewRequestSection salonSlug={salonSlug} />
        </div>
      )}

      {/* ─── Staff Performance tab ────────────────────────────────────────── */}
      {activeTab === "staff" && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Average ratings by staff member, sorted by rating descending.
          </p>

          {staffPerformance.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No staff found.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Staff Member
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Avg Rating
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Reviews
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Last Review
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {staffPerformance.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs uppercase shrink-0">
                            {row.name.charAt(0)}
                          </div>
                          <span className="font-medium text-foreground">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {row.avgRating !== null ? (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {row.avgRating.toFixed(1)}
                            </span>
                            <StarRow rating={Math.round(row.avgRating)} />
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-foreground">{row.reviewCount}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-muted-foreground text-xs">
                          {row.lastReviewDate ? formatDate(row.lastReviewDate) : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ReviewRequestSection (async sub-component) ───────────────────────────────

async function ReviewRequestSection({ salonSlug }: { salonSlug: string }) {
  const unreviewedAppointments = await prisma.appointment.findMany({
    where: { status: "COMPLETED", Review: { is: null } },
    take: 10,
    orderBy: { date: "desc" },
    include: { Client: { select: { id: true, name: true } } },
  });

  if (unreviewedAppointments.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-foreground">Request Reviews</h2>
        <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-xs font-semibold border border-blue-200 dark:border-blue-800">
          {unreviewedAppointments.length}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Completed appointments without a review. Share the link to request feedback.
      </p>
      <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
        {unreviewedAppointments.map((appt) => (
          <div
            key={appt.id}
            className="p-4 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {appt.Client?.name ?? "Guest"}
              </p>
              <p className="text-xs text-muted-foreground">{appt.date}</p>
            </div>
            <CopyReviewLink
              href={`/portal/${salonSlug}/review/${appt.id}`}
              label="Copy review link"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
