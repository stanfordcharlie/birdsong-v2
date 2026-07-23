import type { MetadataRoute } from "next";

// Web app manifest, served at /manifest.webmanifest with an auto-injected
// <link rel="manifest">. Icons are the starburst-bird mark
// (design_handoff_favicon): the 512 is the final asset, the 192 is derived
// from it. Both are purpose "any" only — the mark sits on a transparent
// background with padding, so it is deliberately not declared "maskable"
// (Android's mask would crop into the starburst points). Colors match the
// viewport theme (brand green) and the favicon tile's eggshell ground.
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
