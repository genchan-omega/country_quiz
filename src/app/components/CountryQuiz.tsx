"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  ListRestart,
  RotateCcw,
  Share2,
} from "lucide-react";
import countriesData from "@/data/countries.json";
import WorldMap, { type MarkerStatus } from "./WorldMap";
import QuizAnswerPanel from "./QuizAnswerPanel";
import QuizResultPanel, {
  type ResultCounts,
  type ResultFilter,
} from "./QuizResultPanel";
import QuizSelector, { type ResumeSummary } from "./QuizSelector";
import {
  answerModeLabels,
  getQuizCountries,
  getQuizPath,
  getRandomQuizCodes,
  getRegionCountries,
  getSharePath,
  getVisibleFields,
  quizDirectionLabels,
  regionLabels,
  shuffleQuizCodes,
  siteUrl,
  type AnswerMode,
  type QuestionCount,
  type QuizCountry,
  type QuizDirection,
  type RegionMode,
  type Step,
  type VisibleFields,
} from "../lib/quiz-config";
import {
  getLocationStatus,
  getRowResultFlags,
  getRowStatusForFields,
  type AnswerState,
} from "../lib/answer-check";
import {
  getDueReviewPlan,
  LEARNING_PROGRESS_KEY,
  parseLearningProgress,
  updateLearningProgressForFields,
  updateLearningProgressForLocation,
  type LearningProgressState,
} from "../lib/learning-progress";
import {
  type FieldMaskState,
  LEGACY_QUIZ_STORAGE_KEY,
  type LocationAnswerState,
  parseCodeList,
  parsePersistedQuizState,
  parseQuizPreferences,
  type PersistedQuizState,
  type PracticeKind,
  QUIZ_PREFERENCES_KEY,
  QUIZ_STORAGE_KEY,
  isAnswerMode,
  isQuestionCount,
  isQuizDirection,
  isRegion,
} from "../lib/quiz-storage";
import {
  getWeakItems,
  LEGACY_WEAK_LIST_KEY,
  parseStoredWeakList,
  PREVIOUS_WEAK_LIST_KEY,
  updateWeakListItemForFields,
  updateWeakLocationItem,
  WEAK_LIST_KEY,
  type WeakListState,
} from "../lib/weak-list";
import { createShareText } from "../lib/share-text";

type Props = {
  initialRegion?: RegionMode;
  initialAnswerMode?: AnswerMode;
  initialQuizDirection?: QuizDirection;
  initialStep?: Step;
};

type OverallStatus = "correct" | "incorrect" | "unanswered";

const practiceLabels: Record<Exclude<PracticeKind, "standard">, string> = {
  weak: "苦手リスト",
  daily: "今日の復習",
  incorrect: "間違えた項目",
  unanswered: "未回答の続き",
};

export function CountryQuiz({
  initialRegion = "all",
  initialAnswerMode = "both",
  initialQuizDirection = "write",
  initialStep = "select",
}: Props) {
  const router = useRouter();
  const isDirectQuizUrl = initialStep !== "select";
  const [step, setStep] = useState<Step>(initialStep);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [locationAnswers, setLocationAnswers] =
    useState<LocationAnswerState>({});
  const [activeCode, setActiveCode] = useState(countriesData[0]?.code ?? "");
  const [region, setRegion] = useState<RegionMode>(initialRegion);
  const [answerMode, setAnswerMode] =
    useState<AnswerMode>(initialAnswerMode);
  const [quizDirection, setQuizDirection] =
    useState<QuizDirection>(initialQuizDirection);
  const [weakList, setWeakList] = useState<WeakListState>({});
  const [learningProgress, setLearningProgress] =
    useState<LearningProgressState>({});
  const [practiceKind, setPracticeKind] =
    useState<PracticeKind>("standard");
  const [practiceCodes, setPracticeCodes] = useState<string[]>([]);
  const [practiceFields, setPracticeFields] =
    useState<FieldMaskState>({});
  const [questionCount, setQuestionCount] =
    useState<QuestionCount>("all");
  const [questionCodes, setQuestionCodes] = useState<string[] | null>(null);
  const [promptCodes, setPromptCodes] = useState<string[]>([]);
  const [questionSeed, setQuestionSeed] = useState(0);
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [resumeSession, setResumeSession] =
    useState<PersistedQuizState | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const rowRefs = useRef<Record<string, HTMLElement | null>>({});
  const answerInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);
  const autoAdvanceTimerRef = useRef<number | null>(null);

  const weakItems = useMemo(() => getWeakItems(weakList), [weakList]);
  const dailyReviewPlan = useMemo(
    () =>
      getDueReviewPlan(
        learningProgress,
        weakList,
        quizDirection,
        new Date().toISOString(),
        10
      ),
    [learningProgress, quizDirection, weakList]
  );
  const practiceCodeSet = useMemo(
    () => (practiceCodes.length ? new Set(practiceCodes) : undefined),
    [practiceCodes]
  );
  const selectedCodeSet = useMemo(
    () => (questionCodes ? new Set(questionCodes) : undefined),
    [questionCodes]
  );
  const quizCountries = useMemo<QuizCountry[]>(
    () => getQuizCountries(region, practiceCodeSet, selectedCodeSet),
    [practiceCodeSet, region, selectedCodeSet]
  );
  const promptCountries = useMemo(() => {
    if (quizDirection !== "map" || !promptCodes.length) {
      return quizCountries;
    }

    const byCode = new Map(
      quizCountries.map((country) => [country.code, country])
    );
    const ordered = promptCodes.flatMap((code) => {
      const country = byCode.get(code);
      return country ? [country] : [];
    });
    const included = new Set(ordered.map((country) => country.code));
    return [
      ...ordered,
      ...quizCountries.filter((country) => !included.has(country.code)),
    ];
  }, [promptCodes, quizCountries, quizDirection]);
  const orderedCountries =
    quizDirection === "map" ? promptCountries : quizCountries;
  const activeCountry =
    orderedCountries.find((country) => country.code === activeCode) ??
    orderedCountries[0];
  const mapNumberByCode = useMemo(
    () =>
      new Map(
        quizCountries.map((country) => [country.code, country.quizNumber])
      ),
    [quizCountries]
  );
  const selectedLocationCountry =
    quizDirection === "map" && step === "quiz" && activeCountry
      ? quizCountries.find(
          (country) =>
            country.code === locationAnswers[activeCountry.code]
        )
      : undefined;
  const mapActiveCountry =
    quizDirection === "map" && step === "quiz"
      ? selectedLocationCountry
      : activeCountry;

  const getFieldsForCountry = (code: string): VisibleFields =>
    practiceFields[code] ?? getVisibleFields(answerMode);

  const currentSnapshot = useMemo<PersistedQuizState>(
    () => ({
      answers,
      locationAnswers,
      activeCode,
      region,
      answerMode,
      quizDirection,
      step: step === "result" ? "result" : "quiz",
      practiceKind,
      practiceCodes,
      practiceFields,
      questionCount,
      questionCodes,
      promptCodes,
      questionSeed,
    }),
    [
      activeCode,
      answerMode,
      answers,
      locationAnswers,
      practiceCodes,
      practiceFields,
      practiceKind,
      promptCodes,
      questionCodes,
      questionCount,
      questionSeed,
      quizDirection,
      region,
      step,
    ]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const storedSession = parsePersistedQuizState(
          window.localStorage.getItem(QUIZ_STORAGE_KEY) ??
            window.localStorage.getItem(LEGACY_QUIZ_STORAGE_KEY)
        );
        const preferences = parseQuizPreferences(
          window.localStorage.getItem(QUIZ_PREFERENCES_KEY)
        );
        const savedMatchesDirectRoute =
          storedSession?.region === initialRegion &&
          storedSession.answerMode === initialAnswerMode &&
          storedSession.quizDirection === initialQuizDirection;

        if (isDirectQuizUrl) {
          if (storedSession && savedMatchesDirectRoute) {
            applySession(storedSession);
          } else {
            setAnswers({});
            setLocationAnswers({});
            setPracticeKind("standard");
            setPracticeCodes([]);
            setPracticeFields({});
            setQuestionCount("all");
            setQuestionCodes(null);
            setPromptCodes([]);
            setQuestionSeed(0);
            setStep("quiz");
          }

          setRegion(initialRegion);
          setAnswerMode(initialAnswerMode);
          setQuizDirection(initialQuizDirection);
        } else {
          setRegion(
            preferences && isRegion(preferences.region)
              ? preferences.region
              : storedSession?.region ?? "all"
          );
          setAnswerMode(
            preferences && isAnswerMode(preferences.answerMode)
              ? preferences.answerMode
              : storedSession?.answerMode ?? "both"
          );
          setQuizDirection(
            preferences && isQuizDirection(preferences.quizDirection)
              ? preferences.quizDirection
              : storedSession?.quizDirection ?? "write"
          );
          setQuestionCount(
            preferences && isQuestionCount(preferences.questionCount)
              ? preferences.questionCount
              : "all"
          );
          setResumeSession(storedSession);
          setStep("select");
        }

        setWeakList(
          parseStoredWeakList(
            window.localStorage.getItem(WEAK_LIST_KEY),
            window.localStorage.getItem(PREVIOUS_WEAK_LIST_KEY),
            window.localStorage.getItem(LEGACY_WEAK_LIST_KEY)
          )
        );
        setLearningProgress(
          parseLearningProgress(
            window.localStorage.getItem(LEARNING_PROGRESS_KEY)
          )
        );
      } catch {
        setStep(initialStep);
        setWeakList({});
        setLearningProgress({});
      } finally {
        setMapReady(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [
    initialAnswerMode,
    initialQuizDirection,
    initialRegion,
    initialStep,
    isDirectQuizUrl,
  ]);

  useEffect(() => {
    if (!mapReady) {
      return;
    }

    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(WEAK_LIST_KEY, JSON.stringify(weakList));
        window.localStorage.setItem(
          LEARNING_PROGRESS_KEY,
          JSON.stringify(learningProgress)
        );
        window.localStorage.setItem(
          QUIZ_PREFERENCES_KEY,
          JSON.stringify({ region, answerMode, quizDirection, questionCount })
        );
        if (step !== "select") {
          window.localStorage.setItem(
            QUIZ_STORAGE_KEY,
            JSON.stringify(currentSnapshot)
          );
        }
      } catch {
        // localStorage may be unavailable in private browsing modes.
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [
    answerMode,
    currentSnapshot,
    learningProgress,
    mapReady,
    questionCount,
    quizDirection,
    region,
    step,
    weakList,
  ]);

  useEffect(() => {
    if (!orderedCountries.some((country) => country.code === activeCode)) {
      const timer = window.setTimeout(() => {
        setActiveCode(orderedCountries[0]?.code ?? "");
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [activeCode, orderedCountries]);

  useEffect(
    () => () => {
      if (autoAdvanceTimerRef.current !== null) {
        window.clearTimeout(autoAdvanceTimerRef.current);
      }
    },
    []
  );

  function applySession(session: PersistedQuizState) {
    setAnswers(session.answers);
    setLocationAnswers(session.locationAnswers);
    setActiveCode(session.activeCode);
    setRegion(session.region);
    setAnswerMode(session.answerMode);
    setQuizDirection(session.quizDirection);
    setPracticeKind(session.practiceKind);
    setPracticeCodes(session.practiceCodes);
    setPracticeFields(session.practiceFields);
    setQuestionCount(session.questionCount);
    setQuestionCodes(session.questionCodes);
    setPromptCodes(session.promptCodes);
    setQuestionSeed(session.questionSeed);
    setResultFilter("all");
    setStep(session.step);
  }

  const quizScopeLabel =
    practiceKind === "standard"
      ? regionLabels[region]
      : practiceLabels[practiceKind];
  const modeLabel =
    (practiceKind !== "standard" && quizDirection === "write"
      ? "対象項目"
      : answerModeLabels[answerMode]) +
    (quizDirection === "map" ? "・" + quizDirectionLabels.map : "");

  const writeRows = useMemo(
    () =>
      quizCountries.map((country) => {
        const fields =
          practiceFields[country.code] ?? getVisibleFields(answerMode);
        const status = getRowStatusForFields(
          country,
          answers[country.code],
          fields
        );
        return { country, fields, status };
      }),
    [answerMode, answers, practiceFields, quizCountries]
  );
  const locationRows = useMemo(
    () =>
      promptCountries.map((country) => ({
        country,
        status: getLocationStatus(locationAnswers[country.code], country),
      })),
    [locationAnswers, promptCountries]
  );
  const stats = useMemo(() => {
    if (quizDirection === "map") {
      return {
        score: locationRows.filter((row) => row.status === "correct").length,
        countryScore: 0,
        countryTotal: 0,
        capitalScore: 0,
        capitalTotal: 0,
      };
    }

    const countryRows = writeRows.filter((row) => row.fields.country);
    const capitalRows = writeRows.filter((row) => row.fields.capital);
    return {
      score: writeRows.filter((row) => row.status.complete).length,
      countryScore: countryRows.filter(
        (row) => row.status.countryStatus === "correct"
      ).length,
      countryTotal: countryRows.length,
      capitalScore: capitalRows.filter(
        (row) => row.status.capitalStatus === "correct"
      ).length,
      capitalTotal: capitalRows.length,
    };
  }, [locationRows, quizDirection, writeRows]);
  const totalQuestions = orderedCountries.length;

  const markerStatuses = useMemo<Record<string, MarkerStatus>>(() => {
    if (quizDirection === "map") {
      return Object.fromEntries(
        locationRows.map(({ country, status }) => [
          country.code,
          status === "correct"
            ? "ok"
            : status === "incorrect"
              ? "ng"
              : "empty",
        ])
      );
    }

    return Object.fromEntries(
      writeRows.map(({ country, status }) => {
        const hasIncorrectField =
          status.countryStatus === "incorrect" ||
          status.capitalStatus === "incorrect";
        return [
          country.code,
          status.complete ? "ok" : hasIncorrectField ? "ng" : "empty",
        ];
      })
    );
  }, [locationRows, quizDirection, writeRows]);

  const resultRows = useMemo(
    () =>
      quizDirection === "map"
        ? locationRows.map(({ country, status }) => ({
            country,
            overallStatus: status as OverallStatus,
            correct: status === "correct",
            incorrect: status === "incorrect",
            unanswered: status === "unanswered",
          }))
        : writeRows.map(({ country, fields, status }) => {
            const flags = getRowResultFlags(status, fields);
            return {
              country,
              overallStatus: flags.correct
                ? ("correct" as const)
                : flags.incorrect
                  ? ("incorrect" as const)
                  : ("unanswered" as const),
              ...flags,
            };
          }),
    [locationRows, quizDirection, writeRows]
  );
  const resultCounts = useMemo<ResultCounts>(
    () => ({
      all: resultRows.length,
      correct: resultRows.filter((row) => row.correct).length,
      incorrect: resultRows.filter((row) => row.incorrect).length,
      unanswered: resultRows.filter((row) => row.unanswered).length,
    }),
    [resultRows]
  );
  const filteredResultCountries = useMemo(() => {
    const allowed = new Set(
      resultRows
        .filter(
          (row) =>
            resultFilter === "all" || row[resultFilter]
        )
        .map((row) => row.country.code)
    );
    return orderedCountries.filter((country) => allowed.has(country.code));
  }, [orderedCountries, resultFilter, resultRows]);

  const selectCountry = (
    code: string,
    options: { focusInput?: boolean } = {}
  ) => {
    setActiveCode(code);
    window.requestAnimationFrame(() => {
      rowRefs.current[code]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      if (
        options.focusInput &&
        quizDirection === "write" &&
        !window.matchMedia("(max-width: 720px)").matches
      ) {
        const fields = getFieldsForCountry(code);
        const firstField = fields.country ? "country" : "capital";
        answerInputRefs.current[code + ":" + firstField]?.focus({
          preventScroll: true,
        });
      }
    });
  };

  const updateAnswer = (
    code: string,
    key: "country" | "capital",
    value: string
  ) => {
    setAnswers((current) => ({
      ...current,
      [code]: {
        country: current[code]?.country ?? "",
        capital: current[code]?.capital ?? "",
        [key]: value,
      },
    }));
    setActiveCode(code);
  };

  const inputSequence = useMemo(
    () =>
      quizCountries.flatMap((country) => {
        const fields =
          practiceFields[country.code] ?? getVisibleFields(answerMode);
        return [
          ...(fields.country
            ? [{ code: country.code, field: "country" as const }]
            : []),
          ...(fields.capital
            ? [{ code: country.code, field: "capital" as const }]
            : []),
        ];
      }),
    [answerMode, practiceFields, quizCountries]
  );

  const handleInputKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement>,
    code: string,
    field: "country" | "capital"
  ) => {
    if (
      event.key !== "Enter" ||
      event.nativeEvent.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }

    event.preventDefault();
    const currentIndex = inputSequence.findIndex(
      (item) => item.code === code && item.field === field
    );
    const next = inputSequence[
      currentIndex + (event.shiftKey ? -1 : 1)
    ];
    if (!next) {
      submitButtonRef.current?.focus();
      return;
    }

    selectCountry(next.code);
    window.requestAnimationFrame(() => {
      answerInputRefs.current[next.code + ":" + next.field]?.focus();
    });
  };

  const selectLocation = (selectedCode: string) => {
    if (!activeCountry) {
      return;
    }

    const targetCode = activeCountry.code;
    setLocationAnswers((current) => ({
      ...current,
      [targetCode]: selectedCode,
    }));

    if (autoAdvanceTimerRef.current !== null) {
      window.clearTimeout(autoAdvanceTimerRef.current);
    }
    autoAdvanceTimerRef.current = window.setTimeout(() => {
      const currentIndex = promptCountries.findIndex(
        (country) => country.code === targetCode
      );
      const next = Array.from(
        { length: promptCountries.length },
        (_, offset) =>
          promptCountries[
            (currentIndex + offset + 1) % promptCountries.length
          ]
      ).find(
        (country) =>
          country.code !== targetCode && !locationAnswers[country.code]
      );
      if (next) {
        selectCountry(next.code);
      }
    }, 220);
  };

  const clearAnswersForCurrentQuiz = () => {
    const codes = new Set(quizCountries.map((country) => country.code));
    setAnswers((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([code]) => !codes.has(code))
      )
    );
    setLocationAnswers((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([code]) => !codes.has(code))
      )
    );
    setActiveCode(orderedCountries[0]?.code ?? "");
    setResultFilter("all");
  };

  const startQuiz = () => {
    const candidates = getQuizCountries(region);
    const nextSeed = Date.now();
    const nextQuestionCodes =
      questionCount === "all"
        ? null
        : getRandomQuizCodes(candidates, questionCount, nextSeed);
    const chosenSet = nextQuestionCodes
      ? new Set(nextQuestionCodes)
      : undefined;
    const chosenCountries = candidates.filter((country) =>
      chosenSet ? chosenSet.has(country.code) : true
    );
    const nextPromptCodes =
      quizDirection === "map"
        ? shuffleQuizCodes(chosenCountries, nextSeed + 1)
        : [];

    setPracticeKind("standard");
    setPracticeCodes([]);
    setPracticeFields({});
    setQuestionSeed(nextSeed);
    setQuestionCodes(nextQuestionCodes);
    setPromptCodes(nextPromptCodes);
    setAnswers({});
    setLocationAnswers({});
    setActiveCode(
      quizDirection === "map"
        ? nextPromptCodes[0] ?? ""
        : chosenCountries[0]?.code ?? ""
    );
    setResultFilter("all");
    setResumeSession(null);
    setStep("quiz");
    router.push(getQuizPath(region, answerMode, quizDirection));
  };

  const startTargetedPractice = (
    kind: Exclude<PracticeKind, "standard">,
    codes: string[],
    fields: FieldMaskState,
    direction: QuizDirection,
    mode: AnswerMode
  ) => {
    const nextCodes = parseCodeList(codes);
    if (!nextCodes.length) {
      return;
    }

    const nextSeed = Date.now();
    const candidateSet = new Set(nextCodes);
    const candidates = getQuizCountries("all", candidateSet);
    const nextPromptCodes =
      direction === "map"
        ? shuffleQuizCodes(candidates, nextSeed + 1)
        : [];

    setRegion("all");
    setAnswerMode(mode);
    setQuizDirection(direction);
    setPracticeKind(kind);
    setPracticeCodes(nextCodes);
    setPracticeFields(fields);
    setQuestionCount("all");
    setQuestionCodes(null);
    setPromptCodes(nextPromptCodes);
    setQuestionSeed(nextSeed);
    setAnswers({});
    setLocationAnswers({});
    setActiveCode(
      direction === "map"
        ? nextPromptCodes[0] ?? ""
        : candidates[0]?.code ?? ""
    );
    setResultFilter("all");
    setResumeSession(null);
    setStep("quiz");
    router.push(getQuizPath("all", mode, direction));
  };

  const startWeakQuiz = () => {
    if (quizDirection === "map") {
      const codes = weakItems
        .filter((item) => item.location.weak)
        .map((item) => item.code);
      startTargetedPractice("weak", codes, {}, "map", answerMode);
      return;
    }

    const fields = Object.fromEntries(
      weakItems.flatMap((item) => {
        const visible = {
          country: item.country.weak,
          capital: item.capital.weak,
        };
        return visible.country || visible.capital
          ? [[item.code, visible]]
          : [];
      })
    ) as FieldMaskState;
    startTargetedPractice(
      "weak",
      Object.keys(fields),
      fields,
      "write",
      "both"
    );
  };

  const startDailyReview = () => {
    if (quizDirection === "map") {
      startTargetedPractice(
        "daily",
        dailyReviewPlan.map((item) => item.code),
        {},
        "map",
        answerMode
      );
      return;
    }

    const fields = Object.fromEntries(
      dailyReviewPlan.map((item) => [item.code, item.fields])
    ) as FieldMaskState;
    startTargetedPractice(
      "daily",
      dailyReviewPlan.map((item) => item.code),
      fields,
      "write",
      "both"
    );
  };

  const persistSnapshot = (snapshot: PersistedQuizState) => {
    try {
      window.localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // The in-memory resume action still remains available.
    }
  };

  const goToSelect = () => {
    persistSnapshot(currentSnapshot);
    setResumeSession(currentSnapshot);
    setStep("select");
    router.push("/");
  };

  const resumeQuiz = () => {
    if (!resumeSession) {
      return;
    }

    applySession(resumeSession);
    router.push(
      getQuizPath(
        resumeSession.region,
        resumeSession.answerMode,
        resumeSession.quizDirection
      )
    );
  };

  const finishQuiz = () => {
    const now = new Date().toISOString();

    if (quizDirection === "map") {
      setWeakList((current) =>
        promptCountries.reduce((next, country) => {
          const status = getLocationStatus(
            locationAnswers[country.code],
            country
          );
          return updateWeakLocationItem(
            next,
            country,
            status,
            locationAnswers[country.code] ?? "",
            now
          );
        }, current)
      );
      setLearningProgress((current) =>
        promptCountries.reduce((next, country) => {
          const status = getLocationStatus(
            locationAnswers[country.code],
            country
          );
          return updateLearningProgressForLocation(
            next,
            country,
            status,
            now
          );
        }, current)
      );
    } else {
      setWeakList((current) =>
        writeRows.reduce(
          (next, { country, fields, status }) =>
            updateWeakListItemForFields(
              next,
              country,
              fields,
              answers[country.code] ?? { country: "", capital: "" },
              status,
              now
            ),
          current
        )
      );
      setLearningProgress((current) =>
        writeRows.reduce(
          (next, { country, fields, status }) =>
            updateLearningProgressForFields(
              next,
              country,
              fields,
              status,
              now
            ),
          current
        )
      );
    }

    setResultFilter("all");
    setStep("result");
  };

  const startResultPractice = (
    statusToRetry: "incorrect" | "unanswered"
  ) => {
    if (quizDirection === "map") {
      const codes = locationRows
        .filter((row) => row.status === statusToRetry)
        .map((row) => row.country.code);
      startTargetedPractice(
        statusToRetry,
        codes,
        {},
        "map",
        answerMode
      );
      return;
    }

    const fields = Object.fromEntries(
      writeRows.flatMap(({ country, fields: visible, status }) => {
        const retryFields = {
          country:
            visible.country && status.countryStatus === statusToRetry,
          capital:
            visible.capital && status.capitalStatus === statusToRetry,
        };
        return retryFields.country || retryFields.capital
          ? [[country.code, retryFields]]
          : [];
      })
    ) as FieldMaskState;
    startTargetedPractice(
      statusToRetry,
      Object.keys(fields),
      fields,
      "write",
      "both"
    );
  };

  const sharePath = getSharePath(
    region,
    answerMode,
    stats.score,
    totalQuestions,
    quizDirection
  );
  const shareUrl = new URL(sharePath, siteUrl).toString();
  const shareMode =
    answerModeLabels[answerMode] +
    (quizDirection === "map" ? "・" + quizDirectionLabels.map : "");
  const shareText = createShareText({
    scope: quizScopeLabel,
    mode: shareMode,
    score: stats.score,
    total: totalQuestions,
    url: shareUrl,
  });
  const shareImageUrl = sharePath + "/opengraph-image";

  const openXShare = () => {
    const intentUrl = new URL("https://twitter.com/intent/tweet");
    intentUrl.searchParams.set("text", shareText);
    window.open(intentUrl.toString(), "_blank", "noopener,noreferrer");
  };

  const resumeSummary = useMemo<ResumeSummary | undefined>(() => {
    if (!resumeSession) {
      return undefined;
    }

    const count = resumeSession.practiceCodes.length
      ? resumeSession.practiceCodes.length
      : resumeSession.questionCodes?.length ??
        getRegionCountries(resumeSession.region).length;
    return {
      scope:
        resumeSession.practiceKind === "standard"
          ? regionLabels[resumeSession.region]
          : practiceLabels[resumeSession.practiceKind],
      mode: answerModeLabels[resumeSession.answerMode],
      direction: quizDirectionLabels[resumeSession.quizDirection],
      count,
      step: resumeSession.step,
    };
  }, [resumeSession]);

  if (!mapReady) {
    return <main className="loading-screen">読み込み中...</main>;
  }

  if (step === "select") {
    return (
      <QuizSelector
        answerMode={answerMode}
        dailyReviewCount={dailyReviewPlan.length}
        onAnswerModeChange={(nextAnswerMode) => {
          setAnswerMode(nextAnswerMode);
          setQuestionCount("all");
        }}
        onQuestionCountChange={setQuestionCount}
        onQuizDirectionChange={(nextDirection) => {
          setQuizDirection(nextDirection);
          setQuestionCount("all");
        }}
        onRegionChange={(nextRegion) => {
          setRegion(nextRegion);
          setQuestionCount("all");
        }}
        onResume={resumeQuiz}
        onStart={startQuiz}
        onStartDailyReview={startDailyReview}
        onStartWeak={startWeakQuiz}
        questionCount={questionCount}
        quizDirection={quizDirection}
        region={region}
        resumeSummary={resumeSummary}
        weakItems={weakItems}
      />
    );
  }

  if (step === "result") {
    return (
      <main className="quiz-shell result-shell">
        <header className="quiz-topbar">
          <button className="ghost-button" onClick={goToSelect} type="button">
            <ArrowLeft size={18} />
            モード選択
          </button>
          <div>
            <strong>{quizScopeLabel}</strong>
            <span>{modeLabel}</span>
          </div>
          <button
            className="ghost-button"
            onClick={() => {
              clearAnswersForCurrentQuiz();
              setStep("quiz");
            }}
            type="button"
          >
            <RotateCcw size={18} />
            もう一度
          </button>
        </header>

        <section className="score-hero" aria-label="採点結果">
          <span>あなたの得点</span>
          <strong>
            {stats.score}/{totalQuestions}
          </strong>
          {quizDirection === "write" &&
          stats.countryTotal > 0 &&
          stats.capitalTotal > 0 ? (
            <small>
              国名 {stats.countryScore}/{stats.countryTotal}・首都{" "}
              {stats.capitalScore}/{stats.capitalTotal}
            </small>
          ) : null}
          <div className="result-primary-actions">
            {resultCounts.incorrect ? (
              <button
                className="primary-small"
                onClick={() => startResultPractice("incorrect")}
                type="button"
              >
                <ListRestart size={17} />
                間違えた項目を復習
              </button>
            ) : null}
            {resultCounts.unanswered ? (
              <button
                className="ghost-button"
                onClick={() => startResultPractice("unanswered")}
                type="button"
              >
                <ListRestart size={17} />
                未回答を続ける
              </button>
            ) : null}
          </div>
          <div className="share-actions">
            <button
              className="x-share-button"
              onClick={openXShare}
              type="button"
            >
              <Share2 size={18} />
              Xに投稿
            </button>
            <a href={shareImageUrl} rel="noreferrer" target="_blank">
              <ExternalLink size={16} />
              共有画像
            </a>
          </div>
        </section>

        <section className="answer-workspace result-workspace">
          <div className="map-column">
            <WorldMap
              activeCountry={mapActiveCountry}
              countries={quizCountries}
              markerStatuses={markerStatuses}
              onSelectCountry={(code) => selectCountry(code)}
            />
          </div>
          <QuizResultPanel
            activeCountry={activeCountry}
            answers={answers}
            countries={filteredResultCountries}
            getFields={getFieldsForCountry}
            locationAnswers={locationAnswers}
            mapNumberByCode={mapNumberByCode}
            onFilterChange={setResultFilter}
            onSelectCountry={selectCountry}
            quizDirection={quizDirection}
            registerRow={(code, element) => {
              rowRefs.current[code] = element;
            }}
            resultCounts={resultCounts}
            resultFilter={resultFilter}
          />
        </section>
      </main>
    );
  }

  return (
    <main className="quiz-shell">
      <header className="quiz-topbar">
        <button className="ghost-button" onClick={goToSelect} type="button">
          <ArrowLeft size={18} />
          モード選択
        </button>
        <div>
          <strong>{quizScopeLabel}</strong>
          <span>{modeLabel}</span>
        </div>
        <span className="topbar-spacer" aria-hidden="true" />
      </header>

      <section className="answer-workspace">
        <div className="map-column">
          <WorldMap
            activeCountry={mapActiveCountry}
            concealCountryNames={quizDirection === "map"}
            countries={quizCountries}
            highlightActiveCountry={quizDirection !== "map"}
            onSelectCountry={(code) =>
              quizDirection === "map"
                ? selectLocation(code)
                : selectCountry(code, { focusInput: true })
            }
          />
        </div>
        <QuizAnswerPanel
          activeCountry={activeCountry}
          answerMode={answerMode}
          answers={answers}
          countries={quizCountries}
          getFields={getFieldsForCountry}
          locationAnswers={locationAnswers}
          onFinish={finishQuiz}
          onInputKeyDown={handleInputKeyDown}
          onSelectCountry={selectCountry}
          onUpdateAnswer={updateAnswer}
          promptCountries={promptCountries}
          quizDirection={quizDirection}
          registerInput={(key, element) => {
            answerInputRefs.current[key] = element;
          }}
          registerRow={(code, element) => {
            rowRefs.current[code] = element;
          }}
          registerSubmit={(element) => {
            submitButtonRef.current = element;
          }}
        />
      </section>
    </main>
  );
}

export default CountryQuiz;
