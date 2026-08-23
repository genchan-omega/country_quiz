import { describe, expect, it } from "vitest";
import countriesData from "@/data/countries.json";
import { getLocationStatus, getRowStatusForFields } from "./answer-check";
import {
  getDueReviewPlan,
  parseLearningProgress,
  updateLearningProgressForFields,
  updateLearningProgressForLocation,
  type LearningProgressState,
} from "./learning-progress";
import {
  updateWeakListItemForFields,
  type WeakListState,
} from "./weak-list";

const usa = countriesData.find((country) => country.code === "USA");
if (!usa) throw new Error("Missing USA fixture");

describe("learning progress", () => {
  it("does not schedule unanswered fields", () => {
    const fields = { country: true, capital: true };
    const status = getRowStatusForFields(
      usa,
      { country: "", capital: "" },
      fields
    );
    const next = updateLearningProgressForFields(
      {},
      usa,
      fields,
      status,
      "2026-08-24T00:00:00.000Z"
    );

    expect(next).toEqual({});
  });

  it("uses increasing intervals after consecutive correct answers", () => {
    const fields = { country: true, capital: false };
    const status = getRowStatusForFields(
      usa,
      { country: "アメリカ", capital: "" },
      fields
    );
    const first = updateLearningProgressForFields(
      {},
      usa,
      fields,
      status,
      "2026-08-24T00:00:00.000Z"
    );
    const second = updateLearningProgressForFields(
      first,
      usa,
      fields,
      status,
      "2026-08-25T00:00:00.000Z"
    );

    expect(first.USA.country?.nextReviewAt).toBe("2026-08-25T00:00:00.000Z");
    expect(second.USA.country?.correctStreak).toBe(2);
    expect(second.USA.country?.nextReviewAt).toBe("2026-08-28T00:00:00.000Z");
  });

  it("keeps location learning independent from country and capital", () => {
    const next = updateLearningProgressForLocation(
      {},
      usa,
      getLocationStatus("JPN", usa),
      "2026-08-24T00:00:00.000Z"
    );

    expect(next.USA.location?.lastResult).toBe("incorrect");
    expect(next.USA.country).toBeUndefined();
    expect(next.USA.capital).toBeUndefined();
  });

  it("builds field-specific review plans from weak and scheduled items", () => {
    const fields = { country: false, capital: true };
    const wrongAnswer = { country: "", capital: "東京" };
    const rowStatus = getRowStatusForFields(usa, wrongAnswer, fields);
    const weakList = updateWeakListItemForFields(
      {},
      usa,
      fields,
      wrongAnswer,
      rowStatus,
      "2026-08-24T00:00:00.000Z"
    );
    const plan = getDueReviewPlan(
      {},
      weakList,
      "write",
      "2026-08-24T01:00:00.000Z"
    );

    expect(plan).toEqual([
      { code: "USA", fields: { country: false, capital: true } },
    ]);
  });

  it("excludes future reviews and caps the plan", () => {
    const progress = Object.fromEntries(
      countriesData.slice(0, 12).map((country) => [
        country.code,
        {
          code: country.code,
          country: {
            attempts: 1,
            correctStreak: 1,
            lastResult: "correct" as const,
            lastReviewedAt: "2026-08-20T00:00:00.000Z",
            nextReviewAt:
              country.code === countriesData[0].code
                ? "2026-08-26T00:00:00.000Z"
                : "2026-08-21T00:00:00.000Z",
          },
        },
      ])
    ) as LearningProgressState;

    const plan = getDueReviewPlan(
      progress,
      {} as WeakListState,
      "write",
      "2026-08-24T00:00:00.000Z",
      10
    );

    expect(plan).toHaveLength(10);
    expect(plan.some((item) => item.code === countriesData[0].code)).toBe(false);
  });

  it("ignores malformed stored progress", () => {
    expect(parseLearningProgress("not-json")).toEqual({});
    expect(parseLearningProgress(JSON.stringify({ USA: { code: "USA" } }))).toEqual(
      {}
    );
  });
});
