import type { Metadata } from "next";
import "./globals.css";
import { inter, sourceSerif } from "@/lib/fonts";
import { cn } from "@/lib/utils";

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
    <html lang="en" className={cn(inter.variable, sourceSerif.variable)}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
