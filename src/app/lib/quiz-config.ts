import countriesData from "@/data/countries.json";

export type Country = (typeof countriesData)[number];
export type RegionMode = "all" | Country["region"];
export type AnswerMode = "country" | "capital" | "both";
export type QuizDirection = "write" | "map";
export type QuestionCount = "all" | 10 | 20 | 50;
export type Step = "select" | "quiz" | "result";
export type VisibleFields = { country: boolean; capital: boolean };

export type QuizCountry = Country & {
  quizNumber: number;
};

export const siteUrl = "https://countryquiz-rho.vercel.app";
export const siteTitle = "世界196カ国 国名・首都名クイズ";
export const siteDescription =
  "白地図で世界196カ国の国名・首都・位置を学べる地理クイズです。地域別、ランダム出題、苦手復習、地図から選ぶ逆引き問題に対応しています。";

export const regionLabels: Record<RegionMode, string> = {
  all: "全地域",
  Europe: "ヨーロッパ",
  Asia: "アジア",
  Americas: "アメリカ州",
  Africa: "アフリカ",
  Oceania: "オセアニア",
};

export const regionOrder: RegionMode[] = [
  "all",
  "Europe",
  "Asia",
  "Americas",
  "Africa",
  "Oceania",
];

export const regionSlugs: Record<RegionMode, string> = {
  all: "all",
  Europe: "europe",
  Asia: "asia",
  Americas: "americas",
  Africa: "africa",
  Oceania: "oceania",
};

export const regionBySlug = Object.fromEntries(
  Object.entries(regionSlugs).map(([region, slug]) => [slug, region])
) as Record<string, RegionMode>;

export const answerModeLabels: Record<AnswerMode, string> = {
  country: "国名のみ",
  capital: "首都のみ",
  both: "国名と首都",
};

export const answerModeOrder: AnswerMode[] = ["country", "capital", "both"];

export const quizDirectionLabels: Record<QuizDirection, string> = {
  write: "地図から回答",
  map: "地図で選択",
};

export const quizDirectionOrder: QuizDirection[] = ["write", "map"];

export const quizDirectionSlugs: Record<QuizDirection, string> = {
  write: "write",
  map: "map",
};

export const quizDirectionBySlug = Object.fromEntries(
  Object.entries(quizDirectionSlugs).map(([direction, slug]) => [slug, direction])
) as Record<string, QuizDirection>;

export const questionCountOrder: QuestionCount[] = ["all", 10, 20, 50];

export const questionCountLabels: Record<QuestionCount, string> = {
  all: "全問",
  10: "10問",
  20: "20問",
  50: "50問",
};

export const answerModeSlugs: Record<AnswerMode, string> = {
  country: "country",
  capital: "capital",
  both: "both",
};

export const answerModeBySlug = Object.fromEntries(
  Object.entries(answerModeSlugs).map(([mode, slug]) => [slug, mode])
) as Record<string, AnswerMode>;

export const spatialRegionRank: Record<Country["region"], number> = {
  Americas: 0,
  Europe: 1,
  Africa: 2,
  Asia: 3,
  Oceania: 4,
};

export const getVisibleFields = (answerMode: AnswerMode): VisibleFields => ({
  country: answerMode === "country" || answerMode === "both",
  capital: answerMode === "capital" || answerMode === "both",
});

export const getQuizPath = (
  region: RegionMode,
  answerMode: AnswerMode,
  quizDirection: QuizDirection = "write"
) =>
  quizDirection === "write"
    ? `/quiz/${regionSlugs[region]}/${answerModeSlugs[answerMode]}`
    : `/quiz/${regionSlugs[region]}/${answerModeSlugs[answerMode]}/${quizDirectionSlugs[quizDirection]}`;

export const getSharePath = (
  region: RegionMode,
  answerMode: AnswerMode,
  score: number,
  total: number,
  quizDirection: QuizDirection = "write"
) =>
  quizDirection === "write"
    ? `/share/${regionSlugs[region]}/${answerModeSlugs[answerMode]}/${score}/${total}`
    : `/share/${regionSlugs[region]}/${answerModeSlugs[answerMode]}/${quizDirectionSlugs[quizDirection]}/${score}/${total}`;

export const sortSpatially = (source: Country[], region: RegionMode) => {
  const bandSize = region === "all" ? 14 : 8;

  return [...source].sort((a, b) => {
    if (region === "all" && a.region !== b.region) {
      return spatialRegionRank[a.region] - spatialRegionRank[b.region];
    }

    const aBand = Math.floor((90 - a.lat) / bandSize);
    const bBand = Math.floor((90 - b.lat) / bandSize);

    if (aBand !== bBand) {
      return aBand - bBand;
    }

    const direction = aBand % 2 === 0 ? 1 : -1;
    const longitudeOrder = direction * (a.lng - b.lng);

    if (longitudeOrder !== 0) {
      return longitudeOrder;
    }

    return a.countryJa.localeCompare(b.countryJa, "ja");
  });
};

export const getRegionCountries = (region: RegionMode) => {
  return region === "all"
    ? countriesData
    : countriesData.filter((country) => country.region === region);
};

const seededRandom = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
};

export const getRandomQuizCodes = (
  countries: QuizCountry[],
  questionCount: QuestionCount,
  seed: number
) => {
  if (questionCount === "all" || countries.length <= questionCount) {
    return countries.map((country) => country.code);
  }

  return shuffleQuizCodes(countries, seed).slice(0, questionCount);
};

export const shuffleQuizCodes = (
  countries: Pick<QuizCountry, "code">[],
  seed: number
) => {
  const random = seededRandom(seed);
  const shuffled = countries.map((country) => country.code);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
};

export const getQuizCountries = (
  region: RegionMode,
  weakCodes?: Set<string>,
  selectedCodes?: Set<string>
): QuizCountry[] => {
  const source = getRegionCountries(region).filter((country) =>
    (weakCodes ? weakCodes.has(country.code) : true) &&
    (selectedCodes ? selectedCodes.has(country.code) : true)
  );

  return sortSpatially(source, region).map((country, index) => ({
    ...country,
    quizNumber: index + 1,
  }));
};
