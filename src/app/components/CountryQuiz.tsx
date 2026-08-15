"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CircleX,
  CircleHelp,
  ExternalLink,
  RotateCcw,
  Share2,
} from "lucide-react";
import countriesData from "@/data/countries.json";
import WorldMap, { type MarkerStatus } from "./WorldMap";
import QuizSelector from "./QuizSelector";
import {
  answerModeLabels,
  getQuizCountries,
  getQuizPath,
  getSharePath,
  getRandomQuizCodes,
  getVisibleFields,
  regionLabels,
  siteUrl,
  type AnswerMode,
  type QuizCountry,
  type QuestionCount,
  type RegionMode,
  type Step,
} from "../lib/quiz-config";
import {
  getRowStatus,
  isCorrect,
  isHistoricalAnswer,
  type AnswerState,
} from "../lib/answer-check";
import {
  getWeakItems,
  LEGACY_WEAK_LIST_KEY,
  parseStoredWeakList,
  updateWeakListItem,
  WEAK_LIST_KEY,
  type WeakListState,
} from "../lib/weak-list";

const STORAGE_KEY = "country-quiz-state-v3";

type Props = {
  initialRegion?: RegionMode;
  initialAnswerMode?: AnswerMode;
  initialStep?: Step;
};

export function CountryQuiz({
  initialRegion = "all",
  initialAnswerMode = "both",
  initialStep = "select",
}: Props) {
  const router = useRouter();
  const isDirectQuizUrl = initialStep !== "select";
  const [step, setStep] = useState<Step>(initialStep);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [activeCode, setActiveCode] = useState(countriesData[0]?.code ?? "");
  const [region, setRegion] = useState<RegionMode>(initialRegion);
  const [answerMode, setAnswerMode] =
    useState<AnswerMode>(initialAnswerMode);
  const [weakList, setWeakList] = useState<WeakListState>({});
  const [practiceWeakOnly, setPracticeWeakOnly] = useState(false);
  const [practiceCodes, setPracticeCodes] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState<QuestionCount>("all");
  const [questionCodes, setQuestionCodes] = useState<string[] | null>(null);
  const [questionSeed, setQuestionSeed] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const answerRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const resultRowRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const answerInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const weakItems = useMemo(() => getWeakItems(weakList), [weakList]);
  const weakCodes = useMemo(
    () =>
      practiceWeakOnly
        ? new Set(practiceCodes.length ? practiceCodes : weakItems.map((item) => item.code))
        : undefined,
    [practiceCodes, practiceWeakOnly, weakItems]
  );

  const selectedCodes = useMemo(
    () => (questionCodes ? new Set(questionCodes) : undefined),
    [questionCodes]
  );

  const quizCountries = useMemo<QuizCountry[]>(() => {
    return getQuizCountries(region, weakCodes, selectedCodes);
  }, [region, selectedCodes, weakCodes]);

  const activeCountry =
    quizCountries.find((country) => country.code === activeCode) ??
    quizCountries[0];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          setMapReady(true);
          return;
        }

        const saved = JSON.parse(raw) as {
          answers?: AnswerState;
          activeCode?: string;
          region?: RegionMode;
          answerMode?: AnswerMode;
          step?: Step;
          practiceWeakOnly?: boolean;
          practiceCodes?: string[];
          questionCount?: QuestionCount;
          questionCodes?: string[] | null;
          questionSeed?: number;
        };
        const savedMatchesDirectRoute =
          saved.region === initialRegion && saved.answerMode === initialAnswerMode;

        setAnswers(
          isDirectQuizUrl && !savedMatchesDirectRoute
            ? {}
            : saved.answers ?? {}
        );
        setRegion(isDirectQuizUrl ? initialRegion : (saved.region ?? "all"));
        setAnswerMode(
          isDirectQuizUrl ? initialAnswerMode : (saved.answerMode ?? "both")
        );
        setActiveCode(
          isDirectQuizUrl && !savedMatchesDirectRoute
            ? countriesData[0]?.code ?? ""
            : saved.activeCode ?? countriesData[0]?.code ?? ""
        );
        setPracticeWeakOnly(
          isDirectQuizUrl ? false : Boolean(saved.practiceWeakOnly)
        );
        setPracticeCodes(isDirectQuizUrl ? [] : (saved.practiceCodes ?? []));
        setQuestionCount(
          isDirectQuizUrl && !savedMatchesDirectRoute
            ? "all"
            : saved.questionCount ?? "all"
        );
        setQuestionCodes(
          isDirectQuizUrl && !savedMatchesDirectRoute
            ? null
            : Array.isArray(saved.questionCodes)
              ? saved.questionCodes
              : null
        );
        setQuestionSeed(
          isDirectQuizUrl && !savedMatchesDirectRoute
            ? 0
            : Number.isFinite(saved.questionSeed)
              ? saved.questionSeed!
              : 0
        );
        setStep(
          isDirectQuizUrl
            ? initialStep
            : saved.step === "result"
              ? "result"
              : saved.step ?? "select"
        );
      } catch {
        setStep(initialStep);
      } finally {
        try {
          setWeakList(
            parseStoredWeakList(
              window.localStorage.getItem(WEAK_LIST_KEY),
              window.localStorage.getItem(LEGACY_WEAK_LIST_KEY)
            )
          );
        } catch {
          setWeakList({});
        }
        setMapReady(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialAnswerMode, initialRegion, initialStep, isDirectQuizUrl]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            answers,
            activeCode,
            region,
            answerMode,
            step,
            practiceWeakOnly,
            practiceCodes,
            questionCount,
            questionCodes,
            questionSeed,
          })
        );
        window.localStorage.setItem(WEAK_LIST_KEY, JSON.stringify(weakList));
      } catch {
        // localStorage may be unavailable in private browsing modes.
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [
    answers,
    activeCode,
    region,
    answerMode,
    step,
    practiceWeakOnly,
    practiceCodes,
    questionCount,
    questionCodes,
    questionSeed,
    weakList,
  ]);

  useEffect(() => {
    if (!quizCountries.some((country) => country.code === activeCode)) {
      const timer = window.setTimeout(() => {
        setActiveCode(quizCountries[0]?.code ?? "");
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [activeCode, quizCountries]);

  const visibleFields = getVisibleFields(answerMode);
  const quizScopeLabel = practiceWeakOnly ? "苦手リスト" : regionLabels[region];

  const stats = useMemo(() => {
    const rows = quizCountries.map((country) =>
      getRowStatus(country, answers[country.code], answerMode)
    );

    return {
      score: rows.filter((row) => row.complete).length,
      countryScore: quizCountries.filter((country) =>
        isCorrect(answers[country.code]?.country ?? "", country, "country")
      ).length,
      capitalScore: quizCountries.filter((country) =>
        isCorrect(answers[country.code]?.capital ?? "", country, "capital")
      ).length,
    };
  }, [answers, answerMode, quizCountries]);

  const markerStatuses = useMemo<Record<string, MarkerStatus>>(() => {
    return Object.fromEntries(
      quizCountries.map((country) => {
        const status = getRowStatus(country, answers[country.code], answerMode);
        const hasIncorrectField =
          status.countryStatus === "incorrect" ||
          status.capitalStatus === "incorrect";
        const markerStatus: MarkerStatus = status.complete
          ? "ok"
          : hasIncorrectField
            ? "ng"
            : "empty";

        return [country.code, markerStatus];
      })
    );
  }, [answers, answerMode, quizCountries]);

  const selectCountry = (
    code: string,
    options: { focusInput?: boolean } = {}
  ) => {
    setActiveCode(code);
    window.requestAnimationFrame(() => {
      const answerRow = answerRowRefs.current[code];
      const resultRow = resultRowRefs.current[code];
      (answerRow ?? resultRow)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      if (
        options.focusInput &&
        !window.matchMedia("(max-width: 720px)").matches
      ) {
        const firstField = visibleFields.country ? "country" : "capital";
        answerInputRefs.current[`${code}:${firstField}`]?.focus({
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

  const clearAnswersForCurrentQuiz = () => {
    setAnswers((current) => {
      const next = { ...current };
      quizCountries.forEach((country) => {
        delete next[country.code];
      });
      return next;
    });
    setActiveCode(quizCountries[0]?.code ?? "");
  };

  const startQuiz = () => {
    const candidates = getQuizCountries(region, weakCodes);
    const nextSeed = Date.now();
    const nextQuestionCodes =
      questionCount === "all"
        ? null
        : getRandomQuizCodes(candidates, questionCount, nextSeed);
    setPracticeWeakOnly(false);
    setPracticeCodes([]);
    setQuestionSeed(nextSeed);
    setQuestionCodes(nextQuestionCodes);
    setAnswers((current) => {
      const next = { ...current };
      candidates.forEach((country) => delete next[country.code]);
      return next;
    });
    setActiveCode(nextQuestionCodes?.[0] ?? candidates[0]?.code ?? "");
    setStep("quiz");
    router.push(getQuizPath(region, answerMode));
  };

  const startWeakQuiz = () => {
    const nextPracticeCodes = weakItems.map((item) => item.code);
    setRegion("all");
    setPracticeWeakOnly(true);
    setPracticeCodes(nextPracticeCodes);
    setQuestionCount("all");
    setQuestionCodes(null);
    setQuestionSeed(0);
    setAnswers((current) => {
      const next = { ...current };
      nextPracticeCodes.forEach((code) => {
        delete next[code];
      });
      return next;
    });
    setActiveCode(nextPracticeCodes[0] ?? "");
    setStep("quiz");
  };

  const resetCurrentAnswers = () => {
    clearAnswersForCurrentQuiz();
  };

  const goToSelect = () => {
    setPracticeWeakOnly(false);
    setPracticeCodes([]);
    setQuestionCodes(null);
    setQuestionSeed(0);
    setStep("select");
    router.push("/");
  };

  const finishQuiz = () => {
    const now = new Date().toISOString();

    setWeakList((current) => {
      return quizCountries.reduce((next, country) => {
        const answer = answers[country.code] ?? { country: "", capital: "" };
        const rowStatus = getRowStatus(country, answer, answerMode);

        return updateWeakListItem(
          next,
          country,
          answerMode,
          answer,
          rowStatus,
          now
        );
      }, current);
    });

    setStep("result");
  };

  const sharePath = getSharePath(
    region,
    answerMode,
    stats.score,
    quizCountries.length
  );
  const shareUrl = new URL(sharePath, siteUrl).toString();
  const shareText = `世界の国名・首都クイズ ${practiceWeakOnly ? "苦手リスト" : regionLabels[region]} ${answerModeLabels[answerMode]}で ${stats.score}/${quizCountries.length} 正解しました。\n#世界地図クイズ #地理クイズ\n${shareUrl}`;
  const shareImageUrl = `${sharePath}/opengraph-image`;

  const openXShare = () => {
    const intentUrl = new URL("https://twitter.com/intent/tweet");
    intentUrl.searchParams.set("text", shareText);
    window.open(intentUrl.toString(), "_blank", "noopener,noreferrer");
  };

  if (!mapReady) {
    return <main className="loading-screen">読み込み中...</main>;
  }

  if (step === "select") {
    return (
      <QuizSelector
        answerMode={answerMode}
        onAnswerModeChange={(nextAnswerMode) => {
          setAnswerMode(nextAnswerMode);
          setQuestionCount("all");
          setQuestionCodes(null);
          setQuestionSeed(0);
        }}
        onQuestionCountChange={(nextQuestionCount) => {
          setQuestionCount(nextQuestionCount);
          setQuestionCodes(null);
          setQuestionSeed(0);
        }}
        onRegionChange={(nextRegion) => {
          setPracticeWeakOnly(false);
          setRegion(nextRegion);
          setQuestionCount("all");
          setQuestionCodes(null);
          setQuestionSeed(0);
        }}
        onStart={startQuiz}
        onStartWeak={startWeakQuiz}
        questionCount={questionCount}
        region={region}
        weakItems={weakItems}
      />
    );
  }

  if (step === "result") {
    return (
      <main className="quiz-shell result-shell">
        <header className="quiz-topbar">
          <button
            className="ghost-button"
            onClick={goToSelect}
            type="button"
          >
            <ArrowLeft size={18} />
            モード選択
          </button>
          <div>
            <strong>{quizScopeLabel}</strong>
            <span>{answerModeLabels[answerMode]}</span>
          </div>
          <button
            className="ghost-button"
            onClick={() => {
              resetCurrentAnswers();
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
            {stats.score}/{quizCountries.length}
          </strong>
          {answerMode === "both" ? (
            <small>
              国名 {stats.countryScore}/{quizCountries.length}・首都{" "}
              {stats.capitalScore}/{quizCountries.length}
            </small>
          ) : null}
          <div className="share-actions">
            <button className="x-share-button" onClick={openXShare} type="button">
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
              activeCountry={activeCountry}
              countries={quizCountries}
              markerStatuses={markerStatuses}
              onSelectCountry={(code) => selectCountry(code, { focusInput: true })}
            />
          </div>

          <div className="input-panel result-panel">
            <div className="panel-title">
              <h2>答え合わせ</h2>
            </div>
            <div className="result-list" aria-label="回答一覧">
              {quizCountries.map((country) => {
                const answer = answers[country.code] ?? {
                  country: "",
                  capital: "",
                };
                const rowStatus = getRowStatus(country, answer, answerMode);
                const overallStatus = !rowStatus.attempted
                  ? "unanswered"
                  : rowStatus.complete
                    ? "correct"
                    : "incorrect";

                return (
                  <button
                    className={`result-row ${activeCountry.code === country.code ? "active" : ""}`}
                    key={country.code}
                    onClick={() => selectCountry(country.code)}
                    ref={(element) => {
                      resultRowRefs.current[country.code] = element;
                    }}
                    type="button"
                  >
                    <span
                      className={`result-number ${overallStatus}`}
                    >
                      {country.quizNumber}
                    </span>
                    <div className="result-details">
                      <div className="result-row-head">
                        <strong>{country.countryJa}</strong>
                        {overallStatus === "correct" ? (
                          <span className="status-chip correct">
                            <Check size={14} />
                            正解
                          </span>
                        ) : overallStatus === "incorrect" ? (
                          <span className="status-chip incorrect">
                            <CircleHelp size={14} />
                            不正解
                          </span>
                        ) : (
                          <span className="status-chip unanswered">
                            <CircleX size={14} />
                            未回答
                          </span>
                        )}
                      </div>
                      {visibleFields.country ? (
                        <div
                          className={`answer-check ${rowStatus.countryStatus}`}
                        >
                          <span>国名</span>
                          <strong>正解: {country.countryJa}</strong>
                          <small>回答: {answer.country || "未回答"}</small>
                          {isHistoricalAnswer(answer.country, country, "country") ? (
                            <small className="answer-note">
                              以前の表記です。現在の名称は「{country.countryJa}」です。
                            </small>
                          ) : null}
                        </div>
                      ) : null}
                      {visibleFields.capital ? (
                        <div
                          className={`answer-check ${rowStatus.capitalStatus}`}
                        >
                          <span>首都</span>
                          <strong>正解: {country.capitalJa}</strong>
                          <small>回答: {answer.capital || "未回答"}</small>
                          {isHistoricalAnswer(answer.capital, country, "capital") ? (
                            <small className="answer-note">
                              旧首都です。現在の首都は「{country.capitalJa}」です。
                            </small>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="quiz-shell">
      <header className="quiz-topbar">
        <button
          className="ghost-button"
          onClick={goToSelect}
          type="button"
        >
          <ArrowLeft size={18} />
          モード選択
        </button>
        <div>
          <strong>{quizScopeLabel}</strong>
          <span>{answerModeLabels[answerMode]}</span>
        </div>
        <span className="topbar-spacer" aria-hidden="true" />
      </header>

      <section className="answer-workspace">
        <div className="map-column">
          <WorldMap
              activeCountry={activeCountry}
              countries={quizCountries}
              onSelectCountry={(code) => selectCountry(code, { focusInput: true })}
          />
        </div>

        <div className="input-panel">
          <div className="panel-title">
            <h2>回答欄</h2>
            <span>{quizCountries.length}カ国</span>
          </div>

          <div className="input-list">
            {quizCountries.map((country) => (
              <div
                className={`answer-row ${activeCountry.code === country.code ? "active" : ""}`}
                key={country.code}
                ref={(element) => {
                  answerRowRefs.current[country.code] = element;
                }}
              >
                <button
                  className="answer-number"
                  onClick={() => selectCountry(country.code)}
                  type="button"
                >
                  {country.quizNumber}
                </button>
                <div className="answer-fields">
                  {visibleFields.country ? (
                    <label>
                      <span>国名</span>
                      <input
                        autoComplete="off"
                        inputMode="text"
                        onChange={(event) =>
                          updateAnswer(
                            country.code,
                            "country",
                            event.target.value
                          )
                        }
                        onFocus={() => selectCountry(country.code)}
                        placeholder="国名"
                        type="text"
                        value={answers[country.code]?.country ?? ""}
                        ref={(element) => {
                          answerInputRefs.current[`${country.code}:country`] = element;
                        }}
                      />
                    </label>
                  ) : null}
                  {visibleFields.capital ? (
                    <label>
                      <span>首都</span>
                      <input
                        autoComplete="off"
                        inputMode="text"
                        onChange={(event) =>
                          updateAnswer(
                            country.code,
                            "capital",
                            event.target.value
                          )
                        }
                        onFocus={() => selectCountry(country.code)}
                        placeholder="首都"
                        type="text"
                        value={answers[country.code]?.capital ?? ""}
                        ref={(element) => {
                          answerInputRefs.current[`${country.code}:capital`] = element;
                        }}
                      />
                    </label>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <button
            className="submit-button"
            onClick={finishQuiz}
            type="button"
          >
            答え合わせ
          </button>
        </div>
      </section>
    </main>
  );
}

export default CountryQuiz;
