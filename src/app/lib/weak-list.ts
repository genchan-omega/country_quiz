import type { AnswerMode, Country } from "./quiz-config";
import { getVisibleFields } from "./quiz-config";
import type { RowStatus } from "./answer-check";

export type WeakListItem = {
  code: string;
  countryJa: string;
  capitalJa: string;
  region: Country["region"];
  misses: number;
  countryMisses: number;
  capitalMisses: number;
  lastMissedAt: string;
  lastAnswer: {
    country: string;
    capital: string;
  };
};

export type WeakListState = Record<string, WeakListItem>;

export const WEAK_LIST_KEY = "country-quiz-weak-list-v1";

export const parseWeakList = (raw: string | null): WeakListState => {
  if (!raw) {
    return {};
  }

  const parsed = JSON.parse(raw) as WeakListState;

  if (!parsed || typeof parsed !== "object") {
    return {};
  }

  return parsed;
};

export const getWeakItems = (weakList: WeakListState) =>
  Object.values(weakList).sort((a, b) => {
    if (b.misses !== a.misses) {
      return b.misses - a.misses;
    }

    return b.lastMissedAt.localeCompare(a.lastMissedAt);
  });

export const updateWeakListItem = (
  current: WeakListState,
  country: Country,
  answerMode: AnswerMode,
  answer: { country: string; capital: string },
  rowStatus: RowStatus,
  now: string
) => {
  const next = { ...current };

  if (rowStatus.complete) {
    delete next[country.code];
    return next;
  }

  const visible = getVisibleFields(answerMode);
  const previous = next[country.code];

  next[country.code] = {
    code: country.code,
    countryJa: country.countryJa,
    capitalJa: country.capitalJa,
    region: country.region,
    misses: (previous?.misses ?? 0) + 1,
    countryMisses:
      (previous?.countryMisses ?? 0) +
      (visible.country && !rowStatus.countryCorrect ? 1 : 0),
    capitalMisses:
      (previous?.capitalMisses ?? 0) +
      (visible.capital && !rowStatus.capitalCorrect ? 1 : 0),
    lastMissedAt: now,
    lastAnswer: answer,
  };

  return next;
};
