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

import { THEMES, FONT_STYLES } from "@/lib/appSettings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "منصة دروسي",
  description:
    "التخصصات والدليل البيداغوجي للمتربص — منصة دروسي، تطبيق يمكن تثبيته على هاتفك",
  applicationName: "منصة دروسي",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "منصة دروسي",
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
  const fontRow = await db.select().from(meta).where(eq(meta.key, "fontStyle")).limit(1);
  const dataTheme = (THEMES as readonly string[]).includes(themeRow[0]?.value) ? themeRow[0].value : "default";
  const dataFontStyle = (FONT_STYLES as readonly string[]).includes(fontRow[0]?.value) ? fontRow[0].value : "default";
  return (
    <html lang="ar" dir="rtl" data-theme={dataTheme} data-font-style={dataFontStyle} className={`${notokufiArabic.variable} ${constani.variable}`}>
      <body className="min-h-dvh bg-paper font-sans text-ink antialiased">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
