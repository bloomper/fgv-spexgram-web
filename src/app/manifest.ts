import type { MetadataRoute } from "next";

/**
 * Makes Spexgram installable on phones and tablets, so it opens like an app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Spexgram",
    short_name: "Spexgram",
    description: "Spexens bilder och filmer",
    start_url: "/",
    display: "standalone",
    background_color: "#18120f",
    theme_color: "#c2185b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
