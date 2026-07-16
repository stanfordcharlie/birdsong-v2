import { Inter, Source_Serif_4 } from "next/font/google";

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Headings-only serif, used specifically by the company profile setup flow
// (Source Serif 4 over Inter body/UI text). Not applied anywhere else.
export const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-source-serif",
  display: "swap",
});
