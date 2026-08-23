import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "世界196カ国 国名・首都名クイズ",
    short_name: "世界地図クイズ",
    description:
      "白地図で世界196カ国の国名・首都・位置を学べる地理クイズです。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f6f2",
    theme_color: "#0b6e69",
    lang: "ja",
    categories: ["education", "games"],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
