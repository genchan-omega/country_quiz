import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CountryQuiz } from "@/app/components/CountryQuiz";
import {
  answerModeBySlug,
  answerModeLabels,
  answerModeOrder,
  answerModeSlugs,
  getQuizPath,
  regionBySlug,
  regionLabels,
  regionOrder,
  regionSlugs,
  siteDescription,
  siteTitle,
  siteUrl,
  type AnswerMode,
  type RegionMode,
} from "@/app/lib/quiz-config";

type Props = {
  params: Promise<{
    region: string;
    mode: string;
  }>;
};

const resolveParams = async (params: Props["params"]) => {
  const { region: regionSlug, mode: modeSlug } = await params;
  const region = regionBySlug[regionSlug];
  const answerMode = answerModeBySlug[modeSlug];

  if (!region || !answerMode) {
    notFound();
  }

  return { region, answerMode };
};

export function generateStaticParams() {
  return regionOrder.flatMap((region) =>
    answerModeOrder.map((mode) => ({
      region: regionSlugs[region],
      mode: answerModeSlugs[mode],
    }))
  );
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { region, answerMode } = await resolveParams(params);
  const title = `${regionLabels[region]} ${answerModeLabels[answerMode]}`;
  const path = getQuizPath(region, answerMode);

  return {
    title,
    description: `${regionLabels[region]}の${answerModeLabels[answerMode]}を白地図で学習できる地理クイズです。${siteDescription}`,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      locale: "ja_JP",
      url: new URL(path, siteUrl).toString(),
      siteName: siteTitle,
      title: `${title} | ${siteTitle}`,
      description: `${regionLabels[region]}の${answerModeLabels[answerMode]}を白地図で確認しながら入力できます。`,
    },
  };
}

export default async function QuizPage({ params }: Props) {
  const { region, answerMode } = await resolveParams(params);

  return (
    <CountryQuiz
      initialAnswerMode={answerMode as AnswerMode}
      initialRegion={region as RegionMode}
      initialStep="quiz"
    />
  );
}
