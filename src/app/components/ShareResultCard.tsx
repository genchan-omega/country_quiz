import Image from "next/image";
import Link from "next/link";
import {
  answerModeLabels,
  getQuizPath,
  quizDirectionLabels,
  regionLabels,
  type AnswerMode,
  type QuizDirection,
  type RegionMode,
} from "../lib/quiz-config";

type Props = {
  region: RegionMode;
  answerMode: AnswerMode;
  quizDirection: QuizDirection;
  score: number;
  total: number;
  imagePath: string;
};

export default function ShareResultCard({
  region,
  answerMode,
  quizDirection,
  score,
  total,
  imagePath,
}: Props) {
  const percent = Math.round((score / total) * 100);
  const modeLabel =
    answerModeLabels[answerMode] +
    (quizDirection === "map" ? "・" + quizDirectionLabels.map : "");

  return (
    <main className="share-page">
      <section className="share-card" aria-labelledby="share-title">
        <span>World Map Quiz</span>
        <h1 id="share-title">
          {score}/{total} 正解
        </h1>
        <p>
          {regionLabels[region]}・{modeLabel}・正答率 {percent}%
        </p>
        <Image
          alt={
            regionLabels[region] +
            " " +
            modeLabel +
            " " +
            score +
            "/" +
            total +
            " 正解の共有画像"
          }
          height={315}
          priority
          src={imagePath}
          width={600}
        />
        <Link href={getQuizPath(region, answerMode, quizDirection)}>
          同じモードに挑戦する
        </Link>
      </section>
    </main>
  );
}
