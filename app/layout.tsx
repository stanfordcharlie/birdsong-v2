import type { Metadata, Viewport } from "next";
import "./globals.css";
import { inter, youngSerif, archivo } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Birdsong",
  description: "AI-moderated survey platform for B2B demand gen.",
  icons: {
    // icon.svg/icon.png are served from public/ rather than the app/icon.*
    // file convention: Next only auto-picks one file per "icon" base name
    // (it prefers the PNG over the SVG when both exist), so getting <link>
    // tags for both variants needs this explicit config instead.
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    // apple-icon.png itself is still the plain app/ file convention (no
    // naming collision there — it's the only file at that name) and Next
    // still serves it at this URL either way; it has to be listed here too
    // once any `icons` key is set, since that suppresses *all* file-based
    // icon auto-detection, not just the `icon` key above.
    apple: "/apple-icon.png",
  },
};

// Matches the "B" mark's rounded-square fill (public/icon.svg,
// favicon.ico, etc.) — colors browser chrome (mobile address bar, PWA
// splash/install UI) that would otherwise default to white.
//
// width/initialScale restate Next's own defaults; viewportFit: "cover" is
// the part that matters — without it iOS letterboxes the page inside the
// safe area and every env(safe-area-inset-*) resolves to 0px, so the
// respondent survey's home-indicator clearance would silently do nothing.
// userScalable is deliberately left alone: pinch-zoom stays available.
export const viewport: Viewport = {
  themeColor: "#3a6046",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(inter.variable, youngSerif.variable, archivo.variable)}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
