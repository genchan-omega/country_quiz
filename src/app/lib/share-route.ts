import {
  answerModeBySlug,
  regionBySlug,
  type AnswerMode,
  type QuizDirection,
  type RegionMode,
} from "./quiz-config";

export type ShareRouteResult = {
  region: RegionMode;
  answerMode: AnswerMode;
  quizDirection: QuizDirection;
  score: number;
  total: number;
};

export const parseShareRoute = (raw: {
  region: string;
  mode: string;
  first: string;
  second: string;
  third?: string;
}): ShareRouteResult | null => {
  const region = regionBySlug[raw.region];
  const answerMode = answerModeBySlug[raw.mode];
  const isMapResult = raw.first === "map" && raw.third !== undefined;
  const isWriteResult = raw.third === undefined;

  if (!region || !answerMode || (!isMapResult && !isWriteResult)) {
    return null;
  }

  const score = Number(isMapResult ? raw.second : raw.first);
  const total = Number(isMapResult ? raw.third : raw.second);
  if (
    !Number.isInteger(score) ||
    !Number.isInteger(total) ||
    total <= 0 ||
    score < 0 ||
    score > total
  ) {
    return null;
  }

  return {
    region,
    answerMode,
    quizDirection: isMapResult ? "map" : "write",
    score,
    total,
  };
};
