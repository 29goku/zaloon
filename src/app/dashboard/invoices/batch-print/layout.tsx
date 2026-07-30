import { ThemeProvider } from "@/components/theme/theme-provider";

export default function BatchPrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
