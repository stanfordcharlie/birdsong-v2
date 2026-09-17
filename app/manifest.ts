import type { MetadataRoute } from "next";

// Web app manifest, served at /manifest.webmanifest with an auto-injected
// <link rel="manifest">. Icons are the rounded green tile with the cream
// bird mark: the 512 is the final asset, the 192 is derived from it. Both are
// purpose "any" only — the tile's rounded corners are baked into the PNG
// (transparent outside them), so it is deliberately not declared "maskable"
// (Android's mask would expose those transparent corners). Colors match the
// viewport theme (brand green) and the tile's eggshell bird.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Birdsong",
    short_name: "Birdsong",
    description: "AI-moderated survey platform for B2B demand gen.",
    start_url: "/",
    display: "standalone",
    theme_color: "#3a6046",
    background_color: "#faf8f1",
    icons: [
      { src: "/favicon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/favicon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
