import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "חניה בגינדי4",
  description: "ניהול חניות לדיירי הבניין",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-dvh flex flex-col">{children}</body>
    </html>
  );
}
