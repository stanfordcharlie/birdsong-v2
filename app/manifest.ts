import type { MetadataRoute } from "next";

// Web app manifest, served at /manifest.webmanifest with an auto-injected
// <link rel="manifest">. Icons are the sky-blue tile with the cream bird mark
// (birdsong-skyblue-icon-2026-10): both are resized from the 1024 square
// master. Both are purpose "any" only — the tile they replaced baked its
// rounded corners into the PNG and so could not be declared "maskable", and
// nothing here re-opens that question.
//
// ?v=2 matches the <link rel="icon"> URLs in app/layout.tsx: the filenames
// are unchanged from the green tile, so installed PWAs would otherwise keep
// serving the cached old icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Birdsong",
    short_name: "Birdsong",
    description: "AI-moderated research platform for B2B demand gen.",
    start_url: "/",
    display: "standalone",
    theme_color: "#3c6a99",
    background_color: "#faf8f1",
    icons: [
      { src: "/favicon-192.png?v=2", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/favicon-512.png?v=2", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
