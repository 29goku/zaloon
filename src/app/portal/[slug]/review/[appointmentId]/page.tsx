/**
 * Portal review page — delegates to the book flow's review page.
 *
 * The review form already lives at /book/[slug]/review/[appointmentId].
 * We redirect there so we don't duplicate the review logic.
 */
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string; appointmentId: string }>;
}

export default async function PortalReviewPage({ params }: PageProps) {
  const { slug, appointmentId } = await params;
  redirect(`/book/${slug}/review/${appointmentId}`);
}
