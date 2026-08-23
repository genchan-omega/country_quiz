import countriesData from "@/data/countries.json";
import {
  answerModeOrder,
  questionCountOrder,
  quizDirectionOrder,
  regionOrder,
  type AnswerMode,
  type QuestionCount,
  type QuizDirection,
  type RegionMode,
  type VisibleFields,
} from "./quiz-config";
import type { AnswerState } from "./answer-check";

export const QUIZ_STORAGE_KEY = "country-quiz-state-v4";
export const LEGACY_QUIZ_STORAGE_KEY = "country-quiz-state-v3";
export const QUIZ_PREFERENCES_KEY = "country-quiz-preferences-v1";

export type PracticeKind =
  | "standard"
  | "weak"
  | "daily"
  | "incorrect"
  | "unanswered";
export type FieldMaskState = Record<string, VisibleFields>;
export type LocationAnswerState = Record<string, string>;

export type PersistedQuizState = {
  answers: AnswerState;
  locationAnswers: LocationAnswerState;
  activeCode: string;
  region: RegionMode;
  answerMode: AnswerMode;
  quizDirection: QuizDirection;
  step: "quiz" | "result";
  practiceKind: PracticeKind;
  practiceCodes: string[];
  practiceFields: FieldMaskState;
  questionCount: QuestionCount;
  questionCodes: string[] | null;
  promptCodes: string[];
  questionSeed: number;
};

const countryCodes = new Set(countriesData.map((country) => country.code));
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export const isRegion = (value: unknown): value is RegionMode =>
  regionOrder.includes(value as RegionMode);
export const isAnswerMode = (value: unknown): value is AnswerMode =>
  answerModeOrder.includes(value as AnswerMode);
export const isQuizDirection = (value: unknown): value is QuizDirection =>
  quizDirectionOrder.includes(value as QuizDirection);
export const isQuestionCount = (value: unknown): value is QuestionCount =>
  questionCountOrder.includes(value as QuestionCount);

const isPracticeKind = (value: unknown): value is PracticeKind =>
  ["standard", "weak", "daily", "incorrect", "unanswered"].includes(
    value as PracticeKind
  );

export const parseCodeList = (value: unknown) =>
  Array.isArray(value)
    ? Array.from(
        new Set(
          value.filter(
            (code): code is string =>
              typeof code === "string" && countryCodes.has(code)
          )
        )
      )
    : [];

const parseAnswers = (value: unknown): AnswerState => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([code, answer]) => {
      if (!countryCodes.has(code) || !isRecord(answer)) {
        return [];
      }

      return [
        [
          code,
          {
            country:
              typeof answer.country === "string" ? answer.country : "",
            capital:
              typeof answer.capital === "string" ? answer.capital : "",
          },
        ],
      ];
    })
  ) as AnswerState;
};

const parseLocationAnswers = (value: unknown): LocationAnswerState => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      ([targetCode, selectedCode]) =>
        countryCodes.has(targetCode) &&
        typeof selectedCode === "string" &&
        countryCodes.has(selectedCode)
    )
  ) as LocationAnswerState;
};

const parseFieldMasks = (value: unknown): FieldMaskState => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([code, fields]) => {
      if (!countryCodes.has(code) || !isRecord(fields)) {
        return [];
      }

      const visible = {
        country: Boolean(fields.country),
        capital: Boolean(fields.capital),
      };
      return visible.country || visible.capital ? [[code, visible]] : [];
    })
  ) as FieldMaskState;
};

export const parsePersistedQuizState = (
  raw: string | null
): PersistedQuizState | null => {
  if (!raw) {
    return null;
  }

  try {
    const value = JSON.parse(raw);
    if (!isRecord(value)) {
      return null;
    }

    return {
      answers: parseAnswers(value.answers),
      locationAnswers: parseLocationAnswers(value.locationAnswers),
      activeCode:
        typeof value.activeCode === "string" &&
        countryCodes.has(value.activeCode)
          ? value.activeCode
          : countriesData[0]?.code ?? "",
      region: isRegion(value.region) ? value.region : "all",
      answerMode: isAnswerMode(value.answerMode) ? value.answerMode : "both",
      quizDirection: isQuizDirection(value.quizDirection)
        ? value.quizDirection
        : "write",
      step: value.step === "result" ? "result" : "quiz",
      practiceKind: isPracticeKind(value.practiceKind)
        ? value.practiceKind
        : value.practiceWeakOnly
          ? "weak"
          : "standard",
      practiceCodes: parseCodeList(value.practiceCodes),
      practiceFields: parseFieldMasks(value.practiceFields),
      questionCount: isQuestionCount(value.questionCount)
        ? value.questionCount
        : "all",
      questionCodes: Array.isArray(value.questionCodes)
        ? parseCodeList(value.questionCodes)
        : null,
      promptCodes: parseCodeList(value.promptCodes),
      questionSeed:
        typeof value.questionSeed === "number" &&
        Number.isFinite(value.questionSeed)
          ? value.questionSeed
          : 0,
    };
  } catch {
    return null;
  }
};

export const parseQuizPreferences = (raw: string | null) => {
  if (!raw) {
    return null;
  }

  try {
    const value = JSON.parse(raw);
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
};
