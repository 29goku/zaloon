import { prisma } from "@/lib/prisma";
import { Star, Users, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { DeleteReviewButton, CopyReviewLink } from "./review-actions";
import { getAverageRating, getRatingDistribution } from "@/app/actions/reviews";

export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={
            i <= rating
              ? "w-3.5 h-3.5 text-amber-400 fill-amber-400"
              : "w-3.5 h-3.5 text-muted-foreground/30"
          }
        />
      ))}
    </span>
  );
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Try to parse a stored comment as JSON survey payload; fall back to plain text. */
function parseComment(raw: string | null): { text?: string; wouldRecommend?: boolean } {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) return parsed as { text?: string; wouldRecommend?: boolean };
  } catch {
    // not JSON — plain text
  }
  return { text: raw };
}

// ─── Page props ───────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{
    staffId?: string;
    minRating?: string;
    tab?: string;
  }>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReviewsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const staffIdFilter = params.staffId ?? undefined;
  const minRatingFilter = params.minRating ? parseInt(params.minRating) : undefined;
  const activeTab = params.tab === "staff" ? "staff" : "reviews";

  const salon = await prisma.salon.findFirst({ select: { slug: true } });
  const salonSlug = salon?.slug ?? "";

  const [reviews, average, distribution, staffList, unreviewedAppointments] = await Promise.all([
    prisma.review.findMany({
      where: {
        ...(staffIdFilter ? { staffId: staffIdFilter } : {}),
        ...(minRatingFilter ? { rating: { gte: minRatingFilter } } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        Client: { select: { id: true, name: true } },
        Staff: { select: { id: true, name: true } },
      },
    }),
    getAverageRating(staffIdFilter),
    getRatingDistribution(),
    prisma.staff.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.appointment.findMany({
      where: { status: "COMPLETED", Review: { is: null } },
      take: 20,
      orderBy: { date: "desc" },
      include: { Client: { select: { id: true, name: true } } },
    }),
  ]);

  const totalReviews = Object.values(distribution).reduce((a, b) => a + b, 0);

  // ─── Compute "would recommend" rate ────────────────────────────────────────
  const withRecommendData = reviews.filter((r) => {
    if (!r.comment) return false;
    try {
      const p = JSON.parse(r.comment);
      return typeof p === "object" && p !== null && "wouldRecommend" in p;
    } catch {
      return false;
    }
  });

  const recommendYesCount = withRecommendData.filter((r) => {
    try {
      return (JSON.parse(r.comment!) as { wouldRecommend?: boolean }).wouldRecommend === true;
    } catch {
      return false;
    }
  }).length;

  const recommendPct =
    withRecommendData.length > 0
      ? Math.round((recommendYesCount / withRecommendData.length) * 100)
      : null; // null = no survey data yet

  // ─── Staff performance data ─────────────────────────────────────────────────
  const allStaffReviews = await prisma.review.findMany({
    where: { staffId: { not: null } },
    select: { staffId: true, rating: true, comment: true },
  });

  type StaffRow = {
    id: string;
    name: string;
    avgRating: number | null;
    reviewCount: number;
    recommendPct: number | null;
  };

  const staffPerformance: StaffRow[] = staffList.map((staff) => {
    const staffRevs = allStaffReviews.filter((r) => r.staffId === staff.id);
    const avgRating =
      staffRevs.length > 0
        ? staffRevs.reduce((sum, r) => sum + r.rating, 0) / staffRevs.length
        : null;

    const withRec = staffRevs.filter((r) => {
      if (!r.comment) return false;
      try {
        const p = JSON.parse(r.comment);
        return typeof p === "object" && p !== null && "wouldRecommend" in p;
      } catch {
        return false;
      }
    });
    const recYes = withRec.filter((r) => {
      try {
        return (JSON.parse(r.comment!) as { wouldRecommend?: boolean }).wouldRecommend === true;
      } catch {
        return false;
      }
    }).length;

    return {
      id: staff.id,
      name: staff.name,
      avgRating,
      reviewCount: staffRevs.length,
      recommendPct: withRec.length > 0 ? Math.round((recYes / withRec.length) * 100) : null,
    };
  });

  // Sort staff by avgRating desc (nulls last)
  staffPerformance.sort((a, b) => {
    if (a.avgRating === null && b.avgRating === null) return 0;
    if (a.avgRating === null) return 1;
    if (b.avgRating === null) return -1;
    return b.avgRating - a.avgRating;
  });

  // ─── Build tab URLs ─────────────────────────────────────────────────────────
  function buildUrl(newParams: Record<string, string | undefined>) {
    const merged = {
      ...(staffIdFilter ? { staffId: staffIdFilter } : {}),
      ...(minRatingFilter ? { minRating: String(minRatingFilter) } : {}),
      ...(activeTab === "staff" ? { tab: "staff" } : {}),
      ...newParams,
    };
    const cleaned = Object.entries(merged).filter(([, v]) => v !== undefined && v !== "");
    const qs = new URLSearchParams(cleaned as [string, string][]).toString();
    return `/dashboard/reviews${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Star className="w-6 h-6 text-primary fill-primary" />
          Reviews
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Client ratings and feedback for your salon
        </p>
      </div>

      {/* ─── Stats row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Average rating */}
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
            <span className="text-2xl font-bold text-amber-500 leading-none">
              {average !== null ? average.toFixed(1) : "—"}
            </span>
            <Star className="w-4 h-4 text-amber-400 fill-amber-400 mt-0.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Average Rating</p>
            <p className="text-xs text-muted-foreground">
              {totalReviews} review{totalReviews !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Would recommend */}
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
            <ThumbsUp className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {recommendPct !== null ? `${recommendPct}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {recommendPct !== null
                ? "Would recommend"
                : "No survey data yet"}
            </p>
          </div>
        </div>

        {/* Pending reviews */}
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
            <Users className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {unreviewedAppointments.length}
            </p>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </div>
        </div>
      </div>

      {/* ─── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-border pb-0">
        <Link
          href={buildUrl({ tab: undefined })}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "reviews"
              ? "bg-card border border-b-0 border-border text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Reviews
        </Link>
        <Link
          href={buildUrl({ tab: "staff" })}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "staff"
              ? "bg-card border border-b-0 border-border text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Staff Performance
        </Link>
      </div>

      {/* ─── Reviews tab ─────────────────────────────────────────────────── */}
      {activeTab === "reviews" && (
        <div className="space-y-6">
          {/* Rating distribution */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-semibold text-foreground mb-3">Rating Distribution</p>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = distribution[star] ?? 0;
                const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-5 text-right text-muted-foreground font-medium">{star}</span>
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <form className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Filter by Staff</label>
              <select
                name="staffId"
                defaultValue={staffIdFilter ?? ""}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All staff</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Min Rating</label>
              <select
                name="minRating"
                defaultValue={minRatingFilter?.toString() ?? ""}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Any</option>
                <option value="5">5 stars only</option>
                <option value="4">4+ stars</option>
                <option value="3">3+ stars</option>
                <option value="2">2+ stars</option>
              </select>
            </div>

            <button
              type="submit"
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Apply
            </button>

            {(staffIdFilter || minRatingFilter) && (
              <Link
                href="/dashboard/reviews"
                className="h-9 px-4 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted/50 flex items-center transition-colors"
              >
                Clear
              </Link>
            )}
          </form>

          {/* Reviews list */}
          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">
              {reviews.length} Review{reviews.length !== 1 ? "s" : ""}
              {(staffIdFilter || minRatingFilter) && (
                <span className="text-sm font-normal text-muted-foreground ml-2">(filtered)</span>
              )}
            </h2>

            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No reviews yet.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="divide-y divide-border">
                  {reviews.map((review) => {
                    const parsed = parseComment(review.comment);
                    return (
                      <div
                        key={review.id}
                        className="p-4 sm:p-5 flex items-start gap-4 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex-shrink-0 pt-0.5">
                          <StarRow rating={review.rating} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
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
                            {parsed.wouldRecommend !== undefined && (
                              <span
                                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  parsed.wouldRecommend
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                                    : "bg-stone-100 text-stone-500"
                                }`}
                              >
                                {parsed.wouldRecommend ? "Recommends" : "Wouldn't recommend"}
                              </span>
                            )}
                          </div>
                          {parsed.text && (
                            <p className="text-sm text-foreground/80 leading-relaxed">
                              {parsed.text}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1.5">
                            {formatDate(review.createdAt)}
                          </p>
                        </div>

                        <div className="flex-shrink-0">
                          <DeleteReviewButton id={review.id} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* ─── Pending review requests ───────────────────────────────────── */}
          {unreviewedAppointments.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">
                Request Reviews
                <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold">
                  {unreviewedAppointments.length}
                </span>
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Completed appointments without a review. Copy the link to send to your client.
              </p>
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="divide-y divide-border">
                  {unreviewedAppointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="p-4 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {appt.Client?.name ?? "Guest"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {appt.date}
                        </p>
                      </div>
                      <CopyReviewLink
                        href={`/book/${salonSlug}/review/${appt.id}`}
                        label="Copy review link"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ─── Staff Performance tab ────────────────────────────────────────── */}
      {activeTab === "staff" && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Average ratings by staff member, calculated from all submitted reviews.
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
                      Recommend %
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
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <svg
                                  key={i}
                                  viewBox="0 0 24 24"
                                  className={`w-3 h-3 ${
                                    i <= Math.round(row.avgRating!)
                                      ? "text-amber-400 fill-amber-400"
                                      : "text-muted-foreground/20 fill-muted-foreground/20"
                                  }`}
                                >
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-foreground">{row.reviewCount}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {row.recommendPct !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${row.recommendPct}%` }}
                              />
                            </div>
                            <span
                              className={`text-xs font-semibold ${
                                row.recommendPct >= 80
                                  ? "text-emerald-600"
                                  : row.recommendPct >= 60
                                  ? "text-amber-600"
                                  : "text-red-500"
                              }`}
                            >
                              {row.recommendPct}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">No data</span>
                        )}
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
