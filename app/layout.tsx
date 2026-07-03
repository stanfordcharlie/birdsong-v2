import type { Metadata } from "next";
import "./globals.css";
import { inter } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Birdsong",
  description: "AI-moderated survey platform for B2B demand gen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
