import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeInitializer } from "@/components/theme/theme-initializer";
import { PwaRegister } from "@/components/pwa-register";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#B4EFA5",
};

export const metadata: Metadata = {
  title: "Zaloon — Salon Dashboard",
  description: "Modern salon management for professionals worldwide",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/icon-192.svg",
  },
  appleWebApp: {
    capable: true,
    title: "Zaloon",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} h-full`} suppressHydrationWarning>
      <body className="antialiased min-h-full">
        <ThemeProvider>
          <ThemeInitializer />
          {children}
        </ThemeProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
