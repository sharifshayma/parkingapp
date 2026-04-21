import type { Metadata } from "next";
import "./globals.css";
import AnalyticsProvider from "@/components/AnalyticsProvider";

export const metadata: Metadata = {
  title: "שיתוף חניה בגינדי 4",
  description: "ניהול חניות לדיירי הבניין",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-dvh flex flex-col">
        <AnalyticsProvider>{children}</AnalyticsProvider>
      </body>
    </html>
  );
}
