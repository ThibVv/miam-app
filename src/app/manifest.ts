import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Miam — batch cooking",
    short_name: "Miam",
    description: "Planificateur de batch cooking à deux",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f4ef",
    theme_color: "#1f6b4a",
    lang: "fr",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
