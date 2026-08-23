import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CountryQuiz } from "@/app/components/CountryQuiz";
import {
  answerModeBySlug,
  answerModeLabels,
  answerModeOrder,
  answerModeSlugs,
  getQuizPath,
  quizDirectionBySlug,
  quizDirectionLabels,
  quizDirectionSlugs,
  regionBySlug,
  regionLabels,
  regionOrder,
  regionSlugs,
  siteDescription,
  siteTitle,
  siteUrl,
} from "@/app/lib/quiz-config";

type Props = {
  params: Promise<{
    region: string;
    mode: string;
    direction: string;
  }>;
};

const resolveParams = async (params: Props["params"]) => {
  const raw = await params;
  const region = regionBySlug[raw.region];
  const answerMode = answerModeBySlug[raw.mode];
  const quizDirection = quizDirectionBySlug[raw.direction];

  if (!region || !answerMode || quizDirection !== "map") {
    notFound();
  }

  return { region, answerMode, quizDirection };
};

export function generateStaticParams() {
  return regionOrder.flatMap((region) =>
    answerModeOrder.map((mode) => ({
      region: regionSlugs[region],
      mode: answerModeSlugs[mode],
      direction: quizDirectionSlugs.map,
    }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { region, answerMode, quizDirection } = await resolveParams(params);
  const title =
    regionLabels[region] +
    " " +
    answerModeLabels[answerMode] +
    " " +
    quizDirectionLabels[quizDirection];
  const path = getQuizPath(region, answerMode, quizDirection);

  return {
    title,
    description:
      regionLabels[region] +
      "の国名・首都を見て、白地図上の位置を選ぶ地理クイズです。" +
      siteDescription,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "ja_JP",
      url: new URL(path, siteUrl).toString(),
      siteName: siteTitle,
      title: title + " | " + siteTitle,
      description:
        regionLabels[region] +
        "の" +
        answerModeLabels[answerMode] +
        "から国の位置を選べます。",
    },
  };
}

export default async function MapQuizPage({ params }: Props) {
  const { region, answerMode, quizDirection } = await resolveParams(params);

  return (
    <CountryQuiz
      initialAnswerMode={answerMode}
      initialQuizDirection={quizDirection}
      initialRegion={region}
      initialStep="quiz"
    />
  );
}
