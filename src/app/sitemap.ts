import type { MetadataRoute } from "next";

const siteUrl = "https://countryquiz-rho.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date("2026-07-14"),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
