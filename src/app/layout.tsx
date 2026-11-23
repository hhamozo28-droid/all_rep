import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { eq } from "drizzle-orm";
import localFont from "next/font/local";
import { db } from "@/db";
import { meta } from "@/db/schema";
import { I18nProvider } from "@/lib/i18n";

const notokufiArabic = localFont({
  src: "../fonts/NotokufiArabic-Bold.ttf",
  weight: "700",
  display: "swap",
  variable: "--font-arabic",
});

const constani = localFont({
  src: "../fonts/Constani.ttf",
  display: "swap",
  variable: "--font-constani",
});

const THEMES = ["default", "white-black", "red-purple", "brown-shiny"] as const;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "روابط التحميل",
  description:
    "قائمة التخصصات وروابط التحميل عند الطلب — تطبيق يمكن تثبيته على هاتفك",
  applicationName: "روابط التحميل",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "روابط التحميل",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0e6f5c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const themeRow = await db.select().from(meta).where(eq(meta.key, "theme")).limit(1);
  const theme = themeRow[0]?.value;
  const dataTheme = (THEMES as readonly string[]).includes(theme) ? theme : "default";
  return (
    <html lang="ar" dir="rtl" data-theme={dataTheme} className={`${notokufiArabic.variable} ${constani.variable}`}>
      <body className="min-h-dvh bg-paper font-sans text-ink antialiased">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
