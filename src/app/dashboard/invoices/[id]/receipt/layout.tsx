import { ThemeProvider } from "@/components/theme/theme-provider";

export default function ReceiptLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
