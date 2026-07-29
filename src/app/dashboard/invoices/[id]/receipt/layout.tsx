/**
 * Standalone layout for the thermal receipt print page.
 * Bypasses the dashboard shell so nothing but the receipt
 * is visible when printing.
 */
export default function ReceiptLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
