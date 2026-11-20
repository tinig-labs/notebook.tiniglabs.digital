import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "Notebook · tinig labs",
    short_name: "Notebook",
    description: "Record, label and transcribe patient speech. Works offline.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f9fbfa",
    theme_color: "#f9fbfa",
    categories: ["medical", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Record", url: "/app/record", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] }],
  };
}
