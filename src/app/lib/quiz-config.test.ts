import { describe, expect, it } from "vitest";
import countriesData from "@/data/countries.json";
import {
  getQuizPath,
  getSharePath,
  getQuizCountries,
  getRandomQuizCodes,
  getRegionCountries,
  shuffleQuizCodes,
} from "./quiz-config";

describe("quiz data", () => {
  it("contains 196 unique countries", () => {
    expect(countriesData).toHaveLength(196);
    expect(new Set(countriesData.map((country) => country.code)).size).toBe(196);
    expect(new Set(countriesData.map((country) => country.mapKey)).size).toBe(196);
    expect(new Set(countriesData.map((country) => country.numericCode)).size).toBe(196);
  });

  it("generates contiguous quiz numbers without duplicates", () => {
    const countries = getQuizCountries("all");
    expect(countries.map((country) => country.quizNumber)).toEqual(
      Array.from({ length: 196 }, (_, index) => index + 1)
    );

    for (const region of ["Europe", "Asia", "Americas", "Africa", "Oceania"] as const) {
      const regionCountries = getQuizCountries(region);
      expect(new Set(regionCountries.map((country) => country.quizNumber)).size).toBe(
        regionCountries.length
      );
    }
  });

  it("selects a reproducible subset and caps small regions", () => {
    const europe = getQuizCountries("Europe");
    const first = getRandomQuizCodes(europe, 10, 12345);
    const second = getRandomQuizCodes(europe, 10, 12345);
    expect(first).toEqual(second);
    expect(first).toHaveLength(10);
    expect(getRandomQuizCodes(europe, 50, 12345)).toHaveLength(
      Math.min(50, getRegionCountries("Europe").length)
    );
  });

  it("preserves existing write URLs and adds explicit map URLs", () => {
    expect(getQuizPath("Europe", "country")).toBe(
      "/quiz/europe/country"
    );
    expect(getQuizPath("Europe", "country", "map")).toBe(
      "/quiz/europe/country/map"
    );
    expect(getSharePath("Europe", "country", 8, 10)).toBe(
      "/share/europe/country/8/10"
    );
    expect(getSharePath("Europe", "country", 8, 10, "map")).toBe(
      "/share/europe/country/map/8/10"
    );
  });

  it("shuffles prompt order reproducibly without dropping countries", () => {
    const europe = getQuizCountries("Europe").slice(0, 10);
    const first = shuffleQuizCodes(europe, 54321);
    const second = shuffleQuizCodes(europe, 54321);

    expect(first).toEqual(second);
    expect(new Set(first)).toEqual(new Set(europe.map((country) => country.code)));
    expect(first).not.toEqual(europe.map((country) => country.code));
  });
});
