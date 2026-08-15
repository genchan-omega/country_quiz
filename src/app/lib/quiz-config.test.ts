import { describe, expect, it } from "vitest";
import countriesData from "@/data/countries.json";
import {
  getQuizCountries,
  getRandomQuizCodes,
  getRegionCountries,
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
});
