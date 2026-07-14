import type { MetadataRoute } from "next";
import {
  answerModeOrder,
  getQuizPath,
  regionOrder,
  siteUrl,
} from "./lib/quiz-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseEntries: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date("2026-07-14"),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];

  const quizEntries: MetadataRoute.Sitemap = regionOrder.flatMap((region) =>
    answerModeOrder.map((mode) => ({
      url: new URL(getQuizPath(region, mode), siteUrl).toString(),
      lastModified: new Date("2026-07-14"),
      changeFrequency: "monthly" as const,
      priority: region === "all" && mode === "both" ? 0.95 : 0.8,
    }))
  );

  return [...baseEntries, ...quizEntries];
}
