import type { MetadataRoute } from "next";

// Web app manifest, served at /manifest.webmanifest with an auto-injected
// <link rel="manifest">. Icons are the black bird mark on white
// (public/brand/birdsong-mark-black.svg), rendered at 192 and 512.
//
// These two stay as files in public/ rather than moving to Next's app/icon
// convention with the others: a manifest has to name its icons by URL, and
// the generated ones are fingerprinted. Both are purpose "any" only, since
// the rounding is baked into the PNG and so cannot be declared "maskable".
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
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
