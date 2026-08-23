import type { AnswerMode, Country, VisibleFields } from "./quiz-config";
import { getVisibleFields } from "./quiz-config";

export type AnswerState = Record<
  string,
  {
    country: string;
    capital: string;
  }
>;

export type FieldStatus = "correct" | "incorrect" | "unanswered";

export type RowStatus = {
  countryStatus: FieldStatus;
  capitalStatus: FieldStatus;
  countryCorrect: boolean;
  capitalCorrect: boolean;
  complete: boolean;
  attempted: boolean;
};

export type RowResultFlags = {
  correct: boolean;
  incorrect: boolean;
  unanswered: boolean;
};

type AnswerVariant = {
  aliases?: string[];
  historical?: string[];
};

type AnswerVariantMap = Record<
  string,
  { country?: AnswerVariant; capital?: AnswerVariant }
>;

const answerVariants: AnswerVariantMap = {
  BDI: { capital: { historical: ["ブジュンブラ"] } },
  BOL: { capital: { aliases: ["スクレ", "ラパス"] } },
  BRN: { country: { aliases: ["ブルネイ"] } },
  CPV: { country: { aliases: ["カーボベルデ", "ケープベルデ"] } },
  CIV: {
    country: { aliases: ["コートジボワール", "象牙海岸"] },
    capital: { aliases: ["ヤムスクロ"] },
  },
  COD: {
    country: {
      aliases: [
        "コンゴ民主共和国",
        "コンゴ民主",
        "DRコンゴ",
        "DRC",
        "Democratic Republic of Congo",
        "Congo Kinshasa",
      ],
    },
    capital: { aliases: ["キンシャサ"] },
  },
  COG: {
    country: {
      aliases: ["コンゴ共和国", "コンゴ", "Republic of Congo", "Congo Brazzaville"],
    },
    capital: { aliases: ["ブラザビル"] },
  },
  CZE: {
    country: { aliases: ["チェコ", "チェコ共和国", "Czechia", "Czech Republic"] },
  },
  FSM: { country: { aliases: ["ミクロネシア", "ミクロネシア連邦"] } },
  GBR: {
    country: { aliases: ["イギリス", "英国", "連合王国", "UK", "United Kingdom"] },
  },
  GEO: { country: { aliases: ["ジョージア", "グルジア"] } },
  GRC: { country: { aliases: ["ギリシャ", "ギリシア"] } },
  KOR: { country: { aliases: ["韓国", "大韓民国", "South Korea", "Republic of Korea"] } },
  LAO: { country: { aliases: ["ラオス", "ラオス人民民主共和国"] } },
  MKD: {
    country: {
      aliases: [
        "北マケドニア",
        "北マケドニア共和国",
        "マケドニア",
        "North Macedonia",
      ],
    },
  },
  MMR: {
    country: { aliases: ["ミャンマー", "ビルマ"] },
    capital: { aliases: ["ネピドー", "ネーピードー"] },
  },
  MDA: { country: { aliases: ["モルドバ", "モルドバ共和国"] } },
  NLD: { country: { aliases: ["オランダ", "ネーデルラント"] } },
  PRK: {
    country: {
      aliases: ["北朝鮮", "朝鮮民主主義人民共和国", "North Korea", "DPRK"],
    },
  },
  PSE: { country: { aliases: ["パレスチナ", "パレスチナ国"] } },
  RUS: { country: { aliases: ["ロシア", "ロシア連邦"] } },
  SWZ: { country: { aliases: ["エスワティニ", "スワジランド"] } },
  SYR: { country: { aliases: ["シリア", "シリア・アラブ共和国"] } },
  TLS: { country: { aliases: ["東ティモール", "Timor Leste", "East Timor"] } },
  TUR: { country: { aliases: ["トルコ", "テュルキエ", "Türkiye", "Turkey"] } },
  TZA: { country: { aliases: ["タンザニア", "タンザニア連合共和国"] } },
  USA: {
    country: { aliases: ["アメリカ", "米国", "アメリカ合衆国", "United States", "USA"] },
    capital: { aliases: ["ワシントン", "ワシントンDC", "Washington DC"] },
  },
  VAT: {
    country: { aliases: ["バチカン", "バチカン市国", "ローマ教皇庁", "Holy See"] },
    capital: { aliases: ["バチカン", "バチカン市国", "Vatican"] },
  },
  VEN: { country: { aliases: ["ベネズエラ", "ベネズエラ・ボリバル共和国"] } },
  VNM: { country: { aliases: ["ベトナム", "ヴェトナム", "越南"] } },
};

const toKatakana = (value: string) =>
  value.replace(/[ぁ-ゖ]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) + 0x60)
  );

export const normalizeAnswer = (value: string) =>
  toKatakana(value)
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[’'`´]/g, "")
    .replace(/[ーｰ]/g, "")
    .replace(/[・\s\-.。．,，、:：;；/／()（）[\]「」『』]/g, "");

const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const getVariant = (country: Country, field: "country" | "capital") =>
  answerVariants[country.code]?.[field];

export const getAcceptedAnswers = (
  country: Country,
  field: "country" | "capital"
) => {
  const base =
    field === "country" ? country.countryAnswers : country.capitalAnswers;
  const primary = field === "country" ? country.countryJa : country.capitalJa;
  const english = field === "country" ? country.countryEn : country.capitalEn;
  const aliases = getVariant(country, field)?.aliases ?? [];

  return unique([primary, english, ...base, ...aliases]);
};

export const getHistoricalAnswers = (
  country: Country,
  field: "country" | "capital"
) => getVariant(country, field)?.historical ?? [];

export const isCorrect = (
  value: string,
  country: Country,
  field: "country" | "capital"
) => {
  const normalized = normalizeAnswer(value);
  if (!normalized) {
    return false;
  }

  return getAcceptedAnswers(country, field).some(
    (answer) => normalizeAnswer(answer) === normalized
  );
};

export const isHistoricalAnswer = (
  value: string,
  country: Country,
  field: "country" | "capital"
) => {
  const normalized = normalizeAnswer(value);
  return Boolean(
    normalized &&
      getHistoricalAnswers(country, field).some(
        (answer) => normalizeAnswer(answer) === normalized
      )
  );
};

export const getFieldStatus = (
  value: string | undefined,
  country: Country,
  field: "country" | "capital"
): FieldStatus => {
  if (!value?.trim()) {
    return "unanswered";
  }

  return isCorrect(value, country, field) ? "correct" : "incorrect";
};

export const getRowStatus = (
  country: Country,
  answer: { country: string; capital: string } | undefined,
  answerMode: AnswerMode
): RowStatus => {
  return getRowStatusForFields(
    country,
    answer,
    getVisibleFields(answerMode)
  );
};

export const getRowStatusForFields = (
  country: Country,
  answer: { country: string; capital: string } | undefined,
  visible: VisibleFields
): RowStatus => {
  const countryStatus = visible.country
    ? getFieldStatus(answer?.country, country, "country")
    : "correct";
  const capitalStatus = visible.capital
    ? getFieldStatus(answer?.capital, country, "capital")
    : "correct";
  const attempted =
    (visible.country && Boolean(answer?.country?.trim())) ||
    (visible.capital && Boolean(answer?.capital?.trim()));

  return {
    countryStatus,
    capitalStatus,
    countryCorrect: countryStatus === "correct",
    capitalCorrect: capitalStatus === "correct",
    complete: countryStatus === "correct" && capitalStatus === "correct",
    attempted,
  };
};

export const getLocationStatus = (
  selectedCode: string | undefined,
  country: Country
): FieldStatus => {
  if (!selectedCode) {
    return "unanswered";
  }

  return selectedCode === country.code ? "correct" : "incorrect";
};

export const getRowResultFlags = (
  rowStatus: RowStatus,
  visible: VisibleFields
): RowResultFlags => {
  const statuses = [
    ...(visible.country ? [rowStatus.countryStatus] : []),
    ...(visible.capital ? [rowStatus.capitalStatus] : []),
  ];

  return {
    correct:
      statuses.length > 0 && statuses.every((status) => status === "correct"),
    incorrect: statuses.some((status) => status === "incorrect"),
    unanswered: statuses.some((status) => status === "unanswered"),
  };
};
