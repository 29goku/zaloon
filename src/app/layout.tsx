import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeInitializer } from "@/components/theme/theme-initializer";
import { SwRegister } from "@/components/sw-register";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F48E16",
};

export const metadata: Metadata = {
  title: "Zaloon — Salon Dashboard",
  description: "Modern salon management for professionals worldwide",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    title: "Zaloon",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
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
        <SwRegister />
      </body>
    </html>
  );
}
