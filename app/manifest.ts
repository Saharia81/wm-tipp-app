import type { MetadataRoute } from "next";

// PWA-Manifest. Next.js verlinkt diese Route automatisch im <head>.
// Wird vor allem für Web-Push auf iOS gebraucht: Safari erlaubt Push nur, wenn
// die App über "Zum Home-Bildschirm hinzufügen" installiert wurde (iOS 16.4+),
// und dafür muss ein installierbares Manifest (display: "standalone") da sein.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WM-Tipp 2026",
    short_name: "WM-Tipp",
    description: "Tippe alle 104 Spiele der WM 2026 und werde Tipp-Champion.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a1f44",
    theme_color: "#0a1f44",
    icons: [
      // app/icon.png wird von Next.js unter /icon.png ausgeliefert.
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
