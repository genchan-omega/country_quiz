import type { Country, AnswerMode } from "./quiz-config";
import { getVisibleFields } from "./quiz-config";

export type AnswerState = Record<
  string,
  {
    country: string;
    capital: string;
  }
>;

export type RowStatus = {
  countryCorrect: boolean;
  capitalCorrect: boolean;
  complete: boolean;
  attempted: boolean;
};

type AliasMap = Record<string, { country?: string[]; capital?: string[] }>;

const extraAliases: AliasMap = {
  BDI: { capital: ["ギテガ", "ブジュンブラ"] },
  BOL: { country: ["ボリビア"], capital: ["スクレ", "ラパス"] },
  BRN: { country: ["ブルネイ"], capital: ["バンダルスリブガワン"] },
  CPV: { country: ["カーボベルデ", "ケープベルデ"] },
  CIV: { country: ["コートジボワール", "象牙海岸"], capital: ["ヤムスクロ"] },
  COD: {
    country: [
      "コンゴ民主共和国",
      "コンゴ民主",
      "DRコンゴ",
      "DRC",
      "Democratic Republic of Congo",
      "Congo Kinshasa",
    ],
    capital: ["キンシャサ"],
  },
  COG: {
    country: ["コンゴ共和国", "コンゴ", "Republic of Congo", "Congo Brazzaville"],
    capital: ["ブラザビル"],
  },
  CZE: { country: ["チェコ", "チェコ共和国", "Czechia", "Czech Republic"] },
  FSM: { country: ["ミクロネシア", "ミクロネシア連邦"] },
  GBR: { country: ["イギリス", "英国", "連合王国", "UK", "United Kingdom"] },
  GEO: { country: ["ジョージア", "グルジア"] },
  GRC: { country: ["ギリシャ", "ギリシア"] },
  KOR: { country: ["韓国", "大韓民国", "South Korea", "Republic of Korea"] },
  LAO: { country: ["ラオス", "ラオス人民民主共和国"] },
  MKD: {
    country: [
      "北マケドニア",
      "北マケドニア共和国",
      "マケドニア",
      "North Macedonia",
    ],
  },
  MMR: { country: ["ミャンマー", "ビルマ"], capital: ["ネピドー", "ネーピードー"] },
  MDA: { country: ["モルドバ", "モルドバ共和国"] },
  NLD: { country: ["オランダ", "ネーデルラント"], capital: ["アムステルダム"] },
  PRK: {
    country: ["北朝鮮", "朝鮮民主主義人民共和国", "North Korea", "DPRK"],
  },
  PSE: { country: ["パレスチナ", "パレスチナ国"] },
  RUS: { country: ["ロシア", "ロシア連邦"] },
  SWZ: { country: ["エスワティニ", "スワジランド"] },
  SYR: { country: ["シリア", "シリア・アラブ共和国"] },
  TLS: { country: ["東ティモール", "Timor Leste", "East Timor"] },
  TUR: { country: ["トルコ", "テュルキエ", "Türkiye", "Turkey"] },
  TZA: { country: ["タンザニア", "タンザニア連合共和国"] },
  USA: {
    country: ["アメリカ", "米国", "アメリカ合衆国", "United States", "USA"],
    capital: ["ワシントン", "ワシントンDC", "Washington DC"],
  },
  VAT: {
    country: ["バチカン", "バチカン市国", "ローマ教皇庁", "Holy See"],
    capital: ["バチカン", "バチカン市国", "Vatican"],
  },
  VEN: { country: ["ベネズエラ", "ベネズエラ・ボリバル共和国"] },
  VNM: { country: ["ベトナム", "ヴェトナム", "越南"], capital: ["ハノイ"] },
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

export const getAcceptedAnswers = (
  country: Country,
  field: "country" | "capital"
) => {
  const base =
    field === "country" ? country.countryAnswers : country.capitalAnswers;
  const primary = field === "country" ? country.countryJa : country.capitalJa;
  const english = field === "country" ? country.countryEn : country.capitalEn;
  const aliases = extraAliases[country.code]?.[field] ?? [];

  return unique([primary, english, ...base, ...aliases]);
};

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

export const getRowStatus = (
  country: Country,
  answer: { country: string; capital: string } | undefined,
  answerMode: AnswerMode
): RowStatus => {
  const visible = getVisibleFields(answerMode);
  const countryCorrect = visible.country
    ? isCorrect(answer?.country ?? "", country, "country")
    : true;
  const capitalCorrect = visible.capital
    ? isCorrect(answer?.capital ?? "", country, "capital")
    : true;
  const attempted = Boolean(
    (visible.country && answer?.country.trim()) ||
      (visible.capital && answer?.capital.trim())
  );

  return {
    countryCorrect,
    capitalCorrect,
    complete: countryCorrect && capitalCorrect,
    attempted,
  };
};
