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
    background_color: "#ffffff",
    theme_color: "#1447e6",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
