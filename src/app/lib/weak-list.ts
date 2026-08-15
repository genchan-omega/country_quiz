import type { AnswerMode, Country } from "./quiz-config";
import { getVisibleFields } from "./quiz-config";
import type { RowStatus } from "./answer-check";

export type WeakFieldState = {
  weak: boolean;
  misses: number;
  lastMissedAt?: string;
  lastAnswer?: string;
};

export type WeakListItem = {
  code: string;
  countryJa: string;
  capitalJa: string;
  region: Country["region"];
  country: WeakFieldState;
  capital: WeakFieldState;
};

export type WeakListState = Record<string, WeakListItem>;

export type AnswerValues = {
  country: string;
  capital: string;
};

export const WEAK_LIST_KEY = "country-quiz-weak-list-v2";
export const LEGACY_WEAK_LIST_KEY = "country-quiz-weak-list-v1";

const emptyField = (): WeakFieldState => ({ weak: false, misses: 0 });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const asNonNegativeInteger = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;

const asString = (value: unknown) => (typeof value === "string" ? value : "");

const migrateItem = (value: unknown): WeakListItem | null => {
  if (!isRecord(value)) {
    return null;
  }

  const code = asString(value.code);
  const countryJa = asString(value.countryJa);
  const capitalJa = asString(value.capitalJa);
  const region = value.region as Country["region"];
  if (!code || !countryJa || !capitalJa || !region) {
    return null;
  }

  if (isRecord(value.country) && isRecord(value.capital)) {
    return {
      code,
      countryJa,
      capitalJa,
      region,
      country: {
        weak: Boolean(value.country.weak),
        misses: asNonNegativeInteger(value.country.misses),
        lastMissedAt: asString(value.country.lastMissedAt) || undefined,
        lastAnswer: asString(value.country.lastAnswer) || undefined,
      },
      capital: {
        weak: Boolean(value.capital.weak),
        misses: asNonNegativeInteger(value.capital.misses),
        lastMissedAt: asString(value.capital.lastMissedAt) || undefined,
        lastAnswer: asString(value.capital.lastAnswer) || undefined,
      },
    };
  }

  const legacyAnswer = isRecord(value.lastAnswer)
    ? {
        country: asString(value.lastAnswer.country),
        capital: asString(value.lastAnswer.capital),
      }
    : { country: "", capital: "" };
  const countryMisses = asNonNegativeInteger(value.countryMisses);
  const capitalMisses = asNonNegativeInteger(value.capitalMisses);
  const lastMissedAt = asString(value.lastMissedAt) || undefined;

  return {
    code,
    countryJa,
    capitalJa,
    region,
    country: {
      weak: countryMisses > 0,
      misses: countryMisses,
      lastMissedAt: countryMisses > 0 ? lastMissedAt : undefined,
      lastAnswer: countryMisses > 0 ? legacyAnswer.country : undefined,
    },
    capital: {
      weak: capitalMisses > 0,
      misses: capitalMisses,
      lastMissedAt: capitalMisses > 0 ? lastMissedAt : undefined,
      lastAnswer: capitalMisses > 0 ? legacyAnswer.capital : undefined,
    },
  };
};

const parseObject = (value: unknown): WeakListState => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([code, item]) => [code, migrateItem(item)] as const)
      .filter((entry): entry is [string, WeakListItem] => Boolean(entry[1]))
      .filter(([, item]) => item.country.weak || item.capital.weak)
  );
};

export const parseWeakList = (raw: string | null): WeakListState => {
  if (!raw) {
    return {};
  }

  try {
    return parseObject(JSON.parse(raw));
  } catch {
    return {};
  }
};

export const parseStoredWeakList = (
  currentRaw: string | null,
  legacyRaw: string | null
) => parseWeakList(currentRaw || legacyRaw);

export const getWeakItemMisses = (item: WeakListItem) =>
  item.country.misses + item.capital.misses;

export const getWeakFields = (item: WeakListItem) => {
  const fields: string[] = [];
  if (item.country.weak) fields.push("国名");
  if (item.capital.weak) fields.push("首都");
  return fields;
};

export const getWeakItems = (weakList: WeakListState) =>
  Object.values(weakList).sort((a, b) => {
    const missesDiff = getWeakItemMisses(b) - getWeakItemMisses(a);
    if (missesDiff !== 0) {
      return missesDiff;
    }

    const bDate = b.country.lastMissedAt ?? b.capital.lastMissedAt ?? "";
    const aDate = a.country.lastMissedAt ?? a.capital.lastMissedAt ?? "";
    return bDate.localeCompare(aDate);
  });

const updateField = (
  previous: WeakFieldState,
  status: "correct" | "incorrect" | "unanswered",
  answer: string,
  now: string
): WeakFieldState => {
  if (status === "unanswered") {
    return previous;
  }

  if (status === "correct") {
    return { ...previous, weak: false };
  }

  return {
    weak: true,
    misses: previous.misses + 1,
    lastMissedAt: now,
    lastAnswer: answer,
  };
};

export const updateWeakListItem = (
  current: WeakListState,
  country: Country,
  answerMode: AnswerMode,
  answer: AnswerValues,
  rowStatus: RowStatus,
  now: string
) => {
  const visible = getVisibleFields(answerMode);
  const previous = current[country.code] ?? {
    code: country.code,
    countryJa: country.countryJa,
    capitalJa: country.capitalJa,
    region: country.region,
    country: emptyField(),
    capital: emptyField(),
  };

  const nextItem: WeakListItem = {
    ...previous,
    country: visible.country
      ? updateField(previous.country, rowStatus.countryStatus, answer.country, now)
      : previous.country,
    capital: visible.capital
      ? updateField(previous.capital, rowStatus.capitalStatus, answer.capital, now)
      : previous.capital,
  };
  const next = { ...current };

  if (!nextItem.country.weak && !nextItem.capital.weak) {
    delete next[country.code];
  } else {
    next[country.code] = nextItem;
  }

  return next;
};
