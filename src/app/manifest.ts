import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "InterlocApp - Transporte Interurbano",
    short_name: "InterlocApp",
    description: "Plataforma de boletos, despachos y gestión de cooperativas de transporte en Nicaragua.",
    start_url: "/home",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#FE7D22",
    icons: [
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}

