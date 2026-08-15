import { describe, expect, it } from "vitest";
import countriesData from "@/data/countries.json";
import { getRowStatus } from "./answer-check";
import {
  getWeakFields,
  getWeakItemMisses,
  parseWeakList,
  updateWeakListItem,
  type WeakListState,
} from "./weak-list";

const usa = countriesData.find((country) => country.code === "USA");
if (!usa) throw new Error("Missing USA fixture");

const emptyList = (): WeakListState => ({});

describe("weak list", () => {
  it("does not register unanswered fields", () => {
    const status = getRowStatus(usa, { country: "", capital: "" }, "both");
    const next = updateWeakListItem(
      emptyList(),
      usa,
      "both",
      { country: "", capital: "" },
      status,
      "2026-08-16T00:00:00.000Z"
    );
    expect(next).toEqual({});
  });

  it("increments misses only for explicitly incorrect answers", () => {
    const answer = { country: "アメリカ", capital: "東京" };
    const status = getRowStatus(usa, answer, "both");
    const next = updateWeakListItem(
      emptyList(),
      usa,
      "both",
      answer,
      status,
      "2026-08-16T00:00:00.000Z"
    );
    const item = next.USA;
    expect(item.capital.weak).toBe(true);
    expect(item.capital.misses).toBe(1);
    expect(item.country.weak).toBe(false);
    expect(getWeakItemMisses(item)).toBe(1);
    expect(getWeakFields(item)).toEqual(["首都"]);
  });

  it("does not clear a capital weakness when country-only practice is correct", () => {
    const firstAnswer = { country: "アメリカ", capital: "東京" };
    const first = updateWeakListItem(
      emptyList(),
      usa,
      "both",
      firstAnswer,
      getRowStatus(usa, firstAnswer, "both"),
      "2026-08-16T00:00:00.000Z"
    );
    const secondAnswer = { country: "アメリカ", capital: "" };
    const next = updateWeakListItem(
      first,
      usa,
      "country",
      secondAnswer,
      getRowStatus(usa, secondAnswer, "country"),
      "2026-08-16T00:01:00.000Z"
    );

    expect(next.USA.capital.weak).toBe(true);
    expect(next.USA.capital.misses).toBe(1);
  });

  it("does not clear a country weakness when capital-only practice is correct", () => {
    const firstAnswer = { country: "Atlantis", capital: "ワシントンDC" };
    const first = updateWeakListItem(
      emptyList(),
      usa,
      "both",
      firstAnswer,
      getRowStatus(usa, firstAnswer, "both"),
      "2026-08-16T00:00:00.000Z"
    );
    const secondAnswer = { country: "", capital: "ワシントンDC" };
    const next = updateWeakListItem(
      first,
      usa,
      "capital",
      secondAnswer,
      getRowStatus(usa, secondAnswer, "capital"),
      "2026-08-16T00:01:00.000Z"
    );

    expect(next.USA.country.weak).toBe(true);
    expect(next.USA.country.misses).toBe(1);
  });

  it("removes the country after both field weaknesses are resolved", () => {
    const wrong = { country: "Atlantis", capital: "東京" };
    const first = updateWeakListItem(
      emptyList(),
      usa,
      "both",
      wrong,
      getRowStatus(usa, wrong, "both"),
      "2026-08-16T00:00:00.000Z"
    );
    const correct = { country: "アメリカ", capital: "ワシントンDC" };
    const next = updateWeakListItem(
      first,
      usa,
      "both",
      correct,
      getRowStatus(usa, correct, "both"),
      "2026-08-16T00:01:00.000Z"
    );

    expect(next).toEqual({});
  });

  it("migrates the previous storage shape", () => {
    const migrated = parseWeakList(
      JSON.stringify({
        USA: {
          code: "USA",
          countryJa: "アメリカ合衆国",
          capitalJa: "ワシントンD.C.",
          region: "Americas",
          misses: 2,
          countryMisses: 0,
          capitalMisses: 2,
          lastMissedAt: "2026-08-16T00:00:00.000Z",
          lastAnswer: { country: "", capital: "東京" },
        },
      })
    );
    expect(migrated.USA.capital.weak).toBe(true);
    expect(migrated.USA.country.weak).toBe(false);
  });
});
