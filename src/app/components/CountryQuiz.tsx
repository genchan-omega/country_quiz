"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CircleHelp,
  ExternalLink,
  Play,
  RotateCcw,
  Share2,
  Target,
} from "lucide-react";
import countriesData from "@/data/countries.json";
import WorldMap, { type MarkerStatus } from "./WorldMap";
import {
  answerModeLabels,
  answerModeOrder,
  getQuizCountries,
  getQuizPath,
  getSharePath,
  getVisibleFields,
  regionLabels,
  regionOrder,
  siteUrl,
  type AnswerMode,
  type QuizCountry,
  type RegionMode,
  type Step,
} from "../lib/quiz-config";
import {
  getRowStatus,
  isCorrect,
  type AnswerState,
} from "../lib/answer-check";
import {
  getWeakItems,
  parseWeakList,
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
  const [mapReady, setMapReady] = useState(false);

  const weakItems = useMemo(() => getWeakItems(weakList), [weakList]);
  const weakCodes = useMemo(
    () =>
      practiceWeakOnly
        ? new Set(practiceCodes.length ? practiceCodes : weakItems.map((item) => item.code))
        : undefined,
    [practiceCodes, practiceWeakOnly, weakItems]
  );

  const quizCountries = useMemo<QuizCountry[]>(() => {
    return getQuizCountries(region, weakCodes);
  }, [region, weakCodes]);

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
        };

        setAnswers(saved.answers ?? {});
        setRegion(isDirectQuizUrl ? initialRegion : (saved.region ?? "all"));
        setAnswerMode(
          isDirectQuizUrl ? initialAnswerMode : (saved.answerMode ?? "both")
        );
        setActiveCode(saved.activeCode ?? countriesData[0]?.code ?? "");
        setPracticeWeakOnly(
          isDirectQuizUrl ? false : Boolean(saved.practiceWeakOnly)
        );
        setPracticeCodes(isDirectQuizUrl ? [] : (saved.practiceCodes ?? []));
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
          setWeakList(parseWeakList(window.localStorage.getItem(WEAK_LIST_KEY)));
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
        const markerStatus: MarkerStatus = status.complete
          ? "ok"
          : status.attempted
            ? "ng"
            : "empty";

        return [country.code, markerStatus];
      })
    );
  }, [answers, answerMode, quizCountries]);

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
    setPracticeWeakOnly(false);
    setPracticeCodes([]);
    clearAnswersForCurrentQuiz();
    setStep("quiz");
    router.push(getQuizPath(region, answerMode));
  };

  const startWeakQuiz = () => {
    const nextPracticeCodes = weakItems.map((item) => item.code);
    setRegion("all");
    setPracticeWeakOnly(true);
    setPracticeCodes(nextPracticeCodes);
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
      <main className="select-screen">
        <section className="select-panel" aria-labelledby="app-title">
          <div className="brand-block">
            <p>World Map Quiz</p>
            <h1 id="app-title">世界の国名・首都クイズ</h1>
          </div>

          <div className="select-section">
            <h2>地域</h2>
            <div className="mode-grid">
              {regionOrder.map((mode) => (
                <button
                  className={`mode-card ${region === mode ? "selected" : ""}`}
                  key={mode}
                  onClick={() => {
                    setPracticeWeakOnly(false);
                    setRegion(mode);
                  }}
                  type="button"
                >
                  <strong>{regionLabels[mode]}</strong>
                  <span>
                    {mode === "all"
                      ? `${countriesData.length}カ国`
                      : `${countriesData.filter((country) => country.region === mode).length}カ国`}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="select-section">
            <h2>出題</h2>
            <div className="mode-grid answer-mode-grid">
              {answerModeOrder.map((mode) => (
                <button
                  className={`mode-card ${answerMode === mode ? "selected" : ""}`}
                  key={mode}
                  onClick={() => setAnswerMode(mode)}
                  type="button"
                >
                  <strong>{answerModeLabels[mode]}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="select-section weak-section">
            <div className="weak-heading">
              <h2>苦手リスト</h2>
              <span>{weakItems.length}カ国</span>
            </div>
            {weakItems.length ? (
              <div className="weak-list-preview" aria-label="苦手リスト">
                {weakItems.slice(0, 6).map((item) => (
                  <span key={item.code}>
                    {item.countryJa}
                    <small>{item.misses}回</small>
                  </span>
                ))}
              </div>
            ) : (
              <p className="weak-empty">間違えた国がここに保存されます。</p>
            )}
            <button
              className="secondary-action"
              disabled={!weakItems.length}
              onClick={startWeakQuiz}
              type="button"
            >
              <Target size={18} />
              苦手だけ復習
            </button>
          </div>

          <button className="primary-action" onClick={startQuiz} type="button">
            <Play size={18} />
            開始
          </button>
        </section>
      </main>
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
              onSelectCountry={setActiveCode}
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

                return (
                  <button
                    className={`result-row ${activeCountry.code === country.code ? "active" : ""}`}
                    key={country.code}
                    onClick={() => setActiveCode(country.code)}
                    type="button"
                  >
                    <span
                      className={`result-number ${rowStatus.complete ? "ok" : "ng"}`}
                    >
                      {country.quizNumber}
                    </span>
                    <div className="result-details">
                      <div className="result-row-head">
                        <strong>{country.countryJa}</strong>
                        {rowStatus.complete ? (
                          <span className="status-chip ok">
                            <Check size={14} />
                            正解
                          </span>
                        ) : (
                          <span className="status-chip ng">
                            <CircleHelp size={14} />
                            不正解
                          </span>
                        )}
                      </div>
                      {visibleFields.country ? (
                        <div
                          className={`answer-check ${rowStatus.countryCorrect ? "ok" : "ng"}`}
                        >
                          <span>国名</span>
                          <strong>正解: {country.countryJa}</strong>
                          <small>回答: {answer.country || "未回答"}</small>
                        </div>
                      ) : null}
                      {visibleFields.capital ? (
                        <div
                          className={`answer-check ${rowStatus.capitalCorrect ? "ok" : "ng"}`}
                        >
                          <span>首都</span>
                          <strong>正解: {country.capitalJa}</strong>
                          <small>回答: {answer.capital || "未回答"}</small>
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
            onSelectCountry={setActiveCode}
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
              >
                <button
                  className="answer-number"
                  onClick={() => setActiveCode(country.code)}
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
                        onFocus={() => setActiveCode(country.code)}
                        placeholder="国名"
                        type="text"
                        value={answers[country.code]?.country ?? ""}
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
                        onFocus={() => setActiveCode(country.code)}
                        placeholder="首都"
                        type="text"
                        value={answers[country.code]?.capital ?? ""}
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
