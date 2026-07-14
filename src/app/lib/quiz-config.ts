import countriesData from "@/data/countries.json";

export type Country = (typeof countriesData)[number];
export type RegionMode = "all" | Country["region"];
export type AnswerMode = "country" | "capital" | "both";
export type Step = "select" | "quiz" | "result";

export type QuizCountry = Country & {
  quizNumber: number;
};

export const siteUrl = "https://countryquiz-rho.vercel.app";
export const siteTitle = "世界196カ国 国名・首都名クイズ";
export const siteDescription =
  "白地図を見ながら世界196カ国の国名と首都名を入力できる学習用地理クイズです。地域別、国名のみ、首都のみ、国名と首都のモードに対応しています。";

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

export const getVisibleFields = (answerMode: AnswerMode) => ({
  country: answerMode === "country" || answerMode === "both",
  capital: answerMode === "capital" || answerMode === "both",
});

export const getQuizPath = (region: RegionMode, answerMode: AnswerMode) =>
  `/quiz/${regionSlugs[region]}/${answerModeSlugs[answerMode]}`;

export const getSharePath = (
  region: RegionMode,
  answerMode: AnswerMode,
  score: number,
  total: number
) => `/share/${regionSlugs[region]}/${answerModeSlugs[answerMode]}/${score}/${total}`;

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

export const getQuizCountries = (
  region: RegionMode,
  weakCodes?: Set<string>
): QuizCountry[] => {
  const source = getRegionCountries(region).filter((country) =>
    weakCodes ? weakCodes.has(country.code) : true
  );

  return sortSpatially(source, region).map((country, index) => ({
    ...country,
    quizNumber: index + 1,
  }));
};
