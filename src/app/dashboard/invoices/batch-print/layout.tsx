/**
 * Standalone layout for the batch-print page.
 * Bypasses the dashboard shell so only the invoices are printed.
 */
export default function BatchPrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
