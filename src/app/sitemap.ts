import type { MetadataRoute } from "next";
import {
  answerModeOrder,
  getQuizPath,
  quizDirectionOrder,
  regionOrder,
  siteUrl,
} from "./lib/quiz-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseEntries: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date("2026-08-24"),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];

  const quizEntries: MetadataRoute.Sitemap = regionOrder.flatMap((region) =>
    answerModeOrder.flatMap((mode) =>
      quizDirectionOrder.map((direction) => ({
        url: new URL(getQuizPath(region, mode, direction), siteUrl).toString(),
        lastModified: new Date("2026-08-24"),
        changeFrequency: "monthly" as const,
        priority:
          region === "all" && mode === "both" && direction === "write"
            ? 0.95
            : 0.8,
      }))
    )
  );

  return [...baseEntries, ...quizEntries];
}
