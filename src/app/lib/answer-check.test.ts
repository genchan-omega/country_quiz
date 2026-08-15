import { describe, expect, it } from "vitest";
import countriesData from "@/data/countries.json";
import {
  getHistoricalAnswers,
  getRowStatus,
  isCorrect,
  isHistoricalAnswer,
  normalizeAnswer,
} from "./answer-check";

const getCountry = (code: string) => {
  const country = countriesData.find((item) => item.code === code);
  if (!country) throw new Error(`Missing test country ${code}`);
  return country;
};

describe("normalizeAnswer", () => {
  it("normalizes width, case, spaces, punctuation, and accents", () => {
    expect(normalizeAnswer(" Ｕｎｉｔｅｄ－Ｓｔａｔｅｓ． ")).toBe(
      normalizeAnswer("unitedstates")
    );
    expect(normalizeAnswer("Côte d’Ivoire")).toBe("cotedivoire");
    expect(normalizeAnswer("トウキョウ")).toBe(normalizeAnswer("とうきょう"));
  });
});

describe("answer aliases", () => {
  it.each([
    ["USA", "アメリカ"],
    ["USA", "米国"],
    ["USA", "United States"],
    ["USA", "USA"],
    ["GBR", "イギリス"],
    ["GBR", "英国"],
    ["GBR", "UK"],
    ["GBR", "United Kingdom"],
    ["CZE", "チェコ共和国"],
    ["CZE", "Czechia"],
    ["GEO", "グルジア"],
    ["SWZ", "スワジランド"],
    ["TUR", "テュルキエ"],
    ["TUR", "Türkiye"],
    ["MMR", "ビルマ"],
  ])("accepts %s as %s", (code, answer) => {
    expect(isCorrect(answer, getCountry(code), "country")).toBe(true);
  });

  it("keeps historical capitals separate from current accepted answers", () => {
    const burundi = getCountry("BDI");
    expect(isCorrect("ブジュンブラ", burundi, "capital")).toBe(false);
    expect(isHistoricalAnswer("ブジュンブラ", burundi, "capital")).toBe(true);
    expect(getHistoricalAnswers(burundi, "capital")).toContain("ブジュンブラ");
    expect(isCorrect("ギテガ", burundi, "capital")).toBe(true);
  });

  it("accepts representative capitals", () => {
    expect(isCorrect("東京", getCountry("JPN"), "capital")).toBe(true);
    expect(isCorrect("Washington DC", getCountry("USA"), "capital")).toBe(true);
    expect(isCorrect("ロンドン", getCountry("GBR"), "capital")).toBe(true);
  });
});

describe("getRowStatus", () => {
  it("distinguishes unanswered from incorrect", () => {
    const usa = getCountry("USA");
    const unanswered = getRowStatus(
      usa,
      { country: "", capital: "" },
      "both"
    );
    expect(unanswered.countryStatus).toBe("unanswered");
    expect(unanswered.capitalStatus).toBe("unanswered");
    expect(unanswered.attempted).toBe(false);
    expect(unanswered.complete).toBe(false);

    const incorrect = getRowStatus(
      usa,
      { country: "アメリカ", capital: "東京" },
      "both"
    );
    expect(incorrect.countryStatus).toBe("correct");
    expect(incorrect.capitalStatus).toBe("incorrect");
    expect(incorrect.attempted).toBe(true);
  });
});
