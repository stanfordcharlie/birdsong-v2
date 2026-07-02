import { Inter } from "next/font/google";

// Not yet wired into app/layout.tsx — see DESIGN.md for how to activate
// it once pages start migrating to the new design system.
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
