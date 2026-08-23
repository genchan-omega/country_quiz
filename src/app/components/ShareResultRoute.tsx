import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  answerModeLabels,
  getSharePath,
  quizDirectionLabels,
  regionLabels,
  siteTitle,
  siteUrl,
} from "../lib/quiz-config";
import { parseShareRoute, type ShareRouteResult } from "../lib/share-route";
import ShareResultCard from "./ShareResultCard";

export type SharePageParams = {
  region: string;
  mode: string;
  first: string;
  second: string;
  third?: string;
};

export const resolveShareParams = async (
  params: Promise<SharePageParams>
) => {
  const result = parseShareRoute(await params);
  if (!result) {
    notFound();
  }

  return result;
};

export const createShareMetadata = (result: ShareRouteResult): Metadata => {
  const path = getSharePath(
    result.region,
    result.answerMode,
    result.score,
    result.total,
    result.quizDirection
  );
  const title = `${result.score}/${result.total} 正解`;
  const modeLabel =
    answerModeLabels[result.answerMode] +
    (result.quizDirection === "map"
      ? `・${quizDirectionLabels[result.quizDirection]}`
      : "");
  const description = `${regionLabels[result.region]} ${modeLabel}の結果は ${title}でした。`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "ja_JP",
      url: new URL(path, siteUrl).toString(),
      siteName: siteTitle,
      title: `${title} | ${siteTitle}`,
      description,
      images: [
        {
          url: `${path}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: description,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${siteTitle}`,
      description,
      images: [`${path}/twitter-image`],
    },
  };
};

export const renderShareResult = (result: ShareRouteResult) => {
  const path = getSharePath(
    result.region,
    result.answerMode,
    result.score,
    result.total,
    result.quizDirection
  );

  return (
    <ShareResultCard
      answerMode={result.answerMode}
      imagePath={`${path}/opengraph-image`}
      quizDirection={result.quizDirection}
      region={result.region}
      score={result.score}
      total={result.total}
    />
  );
};
