import { describe, expect, it } from "vitest";
import {
  parseCodeList,
  parsePersistedQuizState,
  parseQuizPreferences,
} from "./quiz-storage";

describe("quiz storage", () => {
  it("migrates the previous weak-practice flag to the current shape", () => {
    const parsed = parsePersistedQuizState(
      JSON.stringify({
        answers: {
          USA: { country: "アメリカ", capital: "" },
          INVALID: { country: "無効", capital: "" },
        },
        activeCode: "USA",
        region: "Americas",
        answerMode: "country",
        step: "quiz",
        practiceWeakOnly: true,
        practiceCodes: ["USA", "USA", "INVALID"],
        questionCount: 10,
        questionCodes: ["USA", "JPN"],
        questionSeed: 123,
      })
    );

    expect(parsed).toMatchObject({
      activeCode: "USA",
      region: "Americas",
      answerMode: "country",
      quizDirection: "write",
      practiceKind: "weak",
      practiceCodes: ["USA"],
      questionCount: 10,
      questionCodes: ["USA", "JPN"],
      promptCodes: [],
    });
    expect(parsed?.answers).toEqual({
      USA: { country: "アメリカ", capital: "" },
    });
  });

  it("retains valid reverse-quiz answers and field masks", () => {
    const parsed = parsePersistedQuizState(
      JSON.stringify({
        locationAnswers: { USA: "JPN", INVALID: "USA" },
        activeCode: "USA",
        region: "all",
        answerMode: "both",
        quizDirection: "map",
        step: "result",
        practiceKind: "incorrect",
        practiceCodes: ["USA"],
        practiceFields: {
          USA: { country: true, capital: false },
          JPN: { country: false, capital: false },
        },
        questionCount: "all",
        promptCodes: ["JPN", "USA"],
      })
    );

    expect(parsed?.locationAnswers).toEqual({ USA: "JPN" });
    expect(parsed?.practiceFields).toEqual({
      USA: { country: true, capital: false },
    });
    expect(parsed?.quizDirection).toBe("map");
    expect(parsed?.step).toBe("result");
  });

  it("rejects malformed storage and filters unknown country codes", () => {
    expect(parsePersistedQuizState("not-json")).toBeNull();
    expect(parsePersistedQuizState(JSON.stringify([]))).toBeNull();
    expect(parseCodeList(["USA", "INVALID", "USA", null])).toEqual(["USA"]);
    expect(parseQuizPreferences("not-json")).toBeNull();
  });
});
