import { ThemeProvider } from "@/components/theme/theme-provider";

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
