import type { AnswerMode, Country, VisibleFields } from "./quiz-config";
import { getVisibleFields } from "./quiz-config";
import type { FieldStatus, RowStatus } from "./answer-check";

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
  location: WeakFieldState;
};

export type WeakListState = Record<string, WeakListItem>;

export type AnswerValues = {
  country: string;
  capital: string;
};

export const WEAK_LIST_KEY = "country-quiz-weak-list-v3";
export const PREVIOUS_WEAK_LIST_KEY = "country-quiz-weak-list-v2";
export const LEGACY_WEAK_LIST_KEY = "country-quiz-weak-list-v1";

const emptyField = (): WeakFieldState => ({ weak: false, misses: 0 });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const asNonNegativeInteger = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;

const asString = (value: unknown) => (typeof value === "string" ? value : "");

const migrateField = (value: unknown): WeakFieldState => {
  if (!isRecord(value)) {
    return emptyField();
  }

  return {
    weak: Boolean(value.weak),
    misses: asNonNegativeInteger(value.misses),
    lastMissedAt: asString(value.lastMissedAt) || undefined,
    lastAnswer: asString(value.lastAnswer) || undefined,
  };
};

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
      country: migrateField(value.country),
      capital: migrateField(value.capital),
      location: migrateField(value.location),
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
    location: emptyField(),
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
      .filter(
        ([, item]) =>
          item.country.weak || item.capital.weak || item.location.weak
      )
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
  previousRaw: string | null,
  legacyRaw: string | null
) => parseWeakList(currentRaw || previousRaw || legacyRaw);

export const getWeakItemMisses = (item: WeakListItem) =>
  item.country.misses + item.capital.misses + item.location.misses;

export const getWeakFields = (item: WeakListItem) => {
  const fields: string[] = [];
  if (item.country.weak) fields.push("国名");
  if (item.capital.weak) fields.push("首都");
  if (item.location.weak) fields.push("位置");
  return fields;
};

export const getWeakFieldCounts = (items: WeakListItem[]) => ({
  country: items.filter((item) => item.country.weak).length,
  capital: items.filter((item) => item.capital.weak).length,
  location: items.filter((item) => item.location.weak).length,
});

export const getWeakItems = (weakList: WeakListState) =>
  Object.values(weakList).sort((a, b) => {
    const missesDiff = getWeakItemMisses(b) - getWeakItemMisses(a);
    if (missesDiff !== 0) {
      return missesDiff;
    }

    const bDate = [
      b.country.lastMissedAt,
      b.capital.lastMissedAt,
      b.location.lastMissedAt,
    ]
      .filter(Boolean)
      .sort()
      .at(-1) ?? "";
    const aDate = [
      a.country.lastMissedAt,
      a.capital.lastMissedAt,
      a.location.lastMissedAt,
    ]
      .filter(Boolean)
      .sort()
      .at(-1) ?? "";
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
  return updateWeakListItemForFields(
    current,
    country,
    getVisibleFields(answerMode),
    answer,
    rowStatus,
    now
  );
};

export const updateWeakListItemForFields = (
  current: WeakListState,
  country: Country,
  visible: VisibleFields,
  answer: AnswerValues,
  rowStatus: RowStatus,
  now: string
) => {
  const previous = current[country.code] ?? {
    code: country.code,
    countryJa: country.countryJa,
    capitalJa: country.capitalJa,
    region: country.region,
    country: emptyField(),
    capital: emptyField(),
    location: emptyField(),
  };

  const nextItem: WeakListItem = {
    ...previous,
    country: visible.country
      ? updateField(previous.country, rowStatus.countryStatus, answer.country, now)
      : previous.country,
    capital: visible.capital
      ? updateField(previous.capital, rowStatus.capitalStatus, answer.capital, now)
      : previous.capital,
    location: previous.location,
  };
  const next = { ...current };

  if (
    !nextItem.country.weak &&
    !nextItem.capital.weak &&
    !nextItem.location.weak
  ) {
    delete next[country.code];
  } else {
    next[country.code] = nextItem;
  }

  return next;
};

export const updateWeakLocationItem = (
  current: WeakListState,
  country: Country,
  status: FieldStatus,
  selectedCode: string,
  now: string
) => {
  const previous = current[country.code] ?? {
    code: country.code,
    countryJa: country.countryJa,
    capitalJa: country.capitalJa,
    region: country.region,
    country: emptyField(),
    capital: emptyField(),
    location: emptyField(),
  };
  const nextItem: WeakListItem = {
    ...previous,
    location: updateField(previous.location, status, selectedCode, now),
  };
  const next = { ...current };

  if (
    !nextItem.country.weak &&
    !nextItem.capital.weak &&
    !nextItem.location.weak
  ) {
    delete next[country.code];
  } else {
    next[country.code] = nextItem;
  }

  return next;
};
