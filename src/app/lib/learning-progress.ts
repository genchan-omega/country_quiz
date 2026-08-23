import type { FieldStatus, RowStatus } from "./answer-check";
import type {
  Country,
  QuizDirection,
  VisibleFields,
} from "./quiz-config";
import type { WeakListState } from "./weak-list";

export type LearningField = "country" | "capital" | "location";

export type LearningFieldState = {
  attempts: number;
  correctStreak: number;
  lastResult: "correct" | "incorrect";
  lastReviewedAt: string;
  nextReviewAt: string;
};

export type LearningProgressItem = {
  code: string;
  country?: LearningFieldState;
  capital?: LearningFieldState;
  location?: LearningFieldState;
};

export type LearningProgressState = Record<string, LearningProgressItem>;

export type ReviewPlanItem = {
  code: string;
  fields: VisibleFields;
};

export const LEARNING_PROGRESS_KEY = "country-quiz-learning-progress-v1";

const DAY_MS = 24 * 60 * 60 * 1000;
const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30, 60] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const isIsoDate = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));

const asNonNegativeInteger = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : 0;

const parseField = (value: unknown): LearningFieldState | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const lastResult = value.lastResult;
  if (
    (lastResult !== "correct" && lastResult !== "incorrect") ||
    !isIsoDate(value.lastReviewedAt) ||
    !isIsoDate(value.nextReviewAt)
  ) {
    return undefined;
  }

  return {
    attempts: asNonNegativeInteger(value.attempts),
    correctStreak: asNonNegativeInteger(value.correctStreak),
    lastResult,
    lastReviewedAt: value.lastReviewedAt,
    nextReviewAt: value.nextReviewAt,
  };
};

export const parseLearningProgress = (
  raw: string | null
): LearningProgressState => {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).flatMap(([storageCode, value]) => {
        if (!isRecord(value)) {
          return [];
        }

        const code = typeof value.code === "string" ? value.code : storageCode;
        if (!code) {
          return [];
        }

        const item: LearningProgressItem = {
          code,
          country: parseField(value.country),
          capital: parseField(value.capital),
          location: parseField(value.location),
        };

        if (!item.country && !item.capital && !item.location) {
          return [];
        }

        return [[code, item]];
      })
    );
  } catch {
    return {};
  }
};

const updateField = (
  previous: LearningFieldState | undefined,
  status: FieldStatus,
  now: string
): LearningFieldState | undefined => {
  if (status === "unanswered") {
    return previous;
  }

  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) {
    return previous;
  }

  const correctStreak = status === "correct" ? (previous?.correctStreak ?? 0) + 1 : 0;
  const intervalDays =
    status === "correct"
      ? REVIEW_INTERVAL_DAYS[
          Math.min(correctStreak - 1, REVIEW_INTERVAL_DAYS.length - 1)
        ]
      : 0;

  return {
    attempts: (previous?.attempts ?? 0) + 1,
    correctStreak,
    lastResult: status,
    lastReviewedAt: now,
    nextReviewAt: new Date(nowMs + intervalDays * DAY_MS).toISOString(),
  };
};

export const updateLearningProgressForFields = (
  current: LearningProgressState,
  country: Country,
  visible: VisibleFields,
  rowStatus: RowStatus,
  now: string
) => {
  const previous = current[country.code] ?? { code: country.code };
  const nextItem: LearningProgressItem = {
    ...previous,
    country: visible.country
      ? updateField(previous.country, rowStatus.countryStatus, now)
      : previous.country,
    capital: visible.capital
      ? updateField(previous.capital, rowStatus.capitalStatus, now)
      : previous.capital,
  };

  if (!nextItem.country && !nextItem.capital && !nextItem.location) {
    return current;
  }

  return { ...current, [country.code]: nextItem };
};

export const updateLearningProgressForLocation = (
  current: LearningProgressState,
  country: Country,
  status: FieldStatus,
  now: string
) => {
  if (status === "unanswered") {
    return current;
  }

  const previous = current[country.code] ?? { code: country.code };
  return {
    ...current,
    [country.code]: {
      ...previous,
      location: updateField(previous.location, status, now),
    },
  };
};

const isDue = (field: LearningFieldState | undefined, nowMs: number) =>
  Boolean(field && Date.parse(field.nextReviewAt) <= nowMs);

const fieldPriority = (
  field: LearningFieldState | undefined,
  weakMisses: number,
  nowMs: number
) => {
  const overdueDays = field
    ? Math.max(0, (nowMs - Date.parse(field.nextReviewAt)) / DAY_MS)
    : 0;
  return weakMisses * 1000 + overdueDays * 10 + (field?.attempts ?? 0);
};

export const getDueReviewPlan = (
  progress: LearningProgressState,
  weakList: WeakListState,
  direction: QuizDirection,
  now: string,
  limit = 10
): ReviewPlanItem[] => {
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs) || limit <= 0) {
    return [];
  }

  const codes = new Set([...Object.keys(progress), ...Object.keys(weakList)]);
  const candidates = [...codes].flatMap((code) => {
    const progressItem = progress[code];
    const weakItem = weakList[code];

    if (direction === "map") {
      const locationDue =
        Boolean(weakItem?.location.weak) || isDue(progressItem?.location, nowMs);
      if (!locationDue) {
        return [];
      }

      return [
        {
          code,
          fields: { country: false, capital: false },
          priority: fieldPriority(
            progressItem?.location,
            weakItem?.location.misses ?? 0,
            nowMs
          ),
        },
      ];
    }

    const countryDue =
      Boolean(weakItem?.country.weak) || isDue(progressItem?.country, nowMs);
    const capitalDue =
      Boolean(weakItem?.capital.weak) || isDue(progressItem?.capital, nowMs);
    if (!countryDue && !capitalDue) {
      return [];
    }

    return [
      {
        code,
        fields: { country: countryDue, capital: capitalDue },
        priority: Math.max(
          countryDue
            ? fieldPriority(
                progressItem?.country,
                weakItem?.country.misses ?? 0,
                nowMs
              )
            : 0,
          capitalDue
            ? fieldPriority(
                progressItem?.capital,
                weakItem?.capital.misses ?? 0,
                nowMs
              )
            : 0
        ),
      },
    ];
  });

  return candidates
    .sort((a, b) => b.priority - a.priority || a.code.localeCompare(b.code))
    .slice(0, limit)
    .map(({ code, fields }) => ({ code, fields }));
};
