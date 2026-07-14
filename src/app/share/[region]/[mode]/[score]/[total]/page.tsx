import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  answerModeBySlug,
  answerModeLabels,
  answerModeSlugs,
  getQuizPath,
  regionBySlug,
  regionLabels,
  regionSlugs,
  siteTitle,
  siteUrl,
} from "@/app/lib/quiz-config";

type Props = {
  params: Promise<{
    region: string;
    mode: string;
    score: string;
    total: string;
  }>;
};

const resolveShareParams = async (params: Props["params"]) => {
  const raw = await params;
  const region = regionBySlug[raw.region];
  const answerMode = answerModeBySlug[raw.mode];
  const score = Number(raw.score);
  const total = Number(raw.total);

  if (
    !region ||
    !answerMode ||
    !Number.isInteger(score) ||
    !Number.isInteger(total) ||
    total <= 0 ||
    score < 0 ||
    score > total
  ) {
    notFound();
  }

  return { region, answerMode, score, total };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { region, answerMode, score, total } = await resolveShareParams(params);
  const path = `/share/${regionSlugs[region]}/${answerModeSlugs[answerMode]}/${score}/${total}`;
  const title = `${score}/${total} 正解`;
  const socialTitle = `${title} | ${siteTitle}`;
  const description = `${regionLabels[region]} ${answerModeLabels[answerMode]}の結果は ${score}/${total} 正解でした。`;

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      locale: "ja_JP",
      url: new URL(path, siteUrl).toString(),
      siteName: siteTitle,
      title: socialTitle,
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
      title: socialTitle,
      description,
      images: [`${path}/twitter-image`],
    },
  };
}

export default async function ShareResultPage({ params }: Props) {
  const { region, answerMode, score, total } = await resolveShareParams(params);
  const quizPath = getQuizPath(region, answerMode);
  const imagePath = `/share/${regionSlugs[region]}/${answerModeSlugs[answerMode]}/${score}/${total}/opengraph-image`;
  const percent = Math.round((score / total) * 100);

  return (
    <main className="share-page">
      <section className="share-card" aria-labelledby="share-title">
        <span>World Map Quiz</span>
        <h1 id="share-title">
          {score}/{total} 正解
        </h1>
        <p>
          {regionLabels[region]}・{answerModeLabels[answerMode]}・正答率 {percent}%
        </p>
        <Image
          alt={`${regionLabels[region]} ${answerModeLabels[answerMode]} ${score}/${total} 正解の共有画像`}
          height={315}
          src={imagePath}
          width={600}
        />
        <Link href={quizPath}>同じモードに挑戦する</Link>
      </section>
    </main>
  );
}
