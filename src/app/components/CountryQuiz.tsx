"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, CircleHelp, Play, RotateCcw } from "lucide-react";
import countriesData from "@/data/countries.json";
import WorldMap, { type MarkerStatus } from "./WorldMap";

type Country = (typeof countriesData)[number];
type RegionMode = "all" | Country["region"];
type AnswerMode = "country" | "capital" | "both";
type Step = "select" | "quiz" | "result";

type QuizCountry = Country & {
  quizNumber: number;
};

type AnswerState = Record<
  string,
  {
    country: string;
    capital: string;
  }
>;

type RowStatus = {
  countryCorrect: boolean;
  capitalCorrect: boolean;
  complete: boolean;
  attempted: boolean;
};

const STORAGE_KEY = "country-quiz-state-v3";

const regionLabels: Record<RegionMode, string> = {
  all: "全地域",
  Europe: "ヨーロッパ",
  Asia: "アジア",
  Americas: "アメリカ州",
  Africa: "アフリカ",
  Oceania: "オセアニア",
};

const regionOrder: RegionMode[] = [
  "all",
  "Europe",
  "Asia",
  "Americas",
  "Africa",
  "Oceania",
];

const answerModeLabels: Record<AnswerMode, string> = {
  country: "国名のみ",
  capital: "首都のみ",
  both: "国名と首都",
};

const spatialRegionRank: Record<Country["region"], number> = {
  Americas: 0,
  Europe: 1,
  Africa: 2,
  Asia: 3,
  Oceania: 4,
};

const normalizeAnswer = (value: string) =>
  value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[・\s\-.]/g, "");

const isCorrect = (value: string, accepted: string[]) => {
  const normalized = normalizeAnswer(value);
  if (!normalized) {
    return false;
  }

  return accepted.some((answer) => normalizeAnswer(answer) === normalized);
};

const getVisibleFields = (answerMode: AnswerMode) => ({
  country: answerMode === "country" || answerMode === "both",
  capital: answerMode === "capital" || answerMode === "both",
});

const getRowStatus = (
  country: Country,
  answer: { country: string; capital: string } | undefined,
  answerMode: AnswerMode
): RowStatus => {
  const visible = getVisibleFields(answerMode);
  const countryCorrect = visible.country
    ? isCorrect(answer?.country ?? "", country.countryAnswers)
    : true;
  const capitalCorrect = visible.capital
    ? isCorrect(answer?.capital ?? "", country.capitalAnswers)
    : true;
  const attempted = Boolean(
    (visible.country && answer?.country.trim()) ||
      (visible.capital && answer?.capital.trim())
  );

  return {
    countryCorrect,
    capitalCorrect,
    complete: countryCorrect && capitalCorrect,
    attempted,
  };
};

const sortSpatially = (source: Country[], region: RegionMode) => {
  const bandSize = region === "all" ? 14 : 8;

  return [...source].sort((a, b) => {
    if (region === "all" && a.region !== b.region) {
      return spatialRegionRank[a.region] - spatialRegionRank[b.region];
    }

    const aBand = Math.floor((90 - a.lat) / bandSize);
    const bBand = Math.floor((90 - b.lat) / bandSize);

    if (aBand !== bBand) {
      return aBand - bBand;
    }

    const direction = aBand % 2 === 0 ? 1 : -1;
    const longitudeOrder = direction * (a.lng - b.lng);

    if (longitudeOrder !== 0) {
      return longitudeOrder;
    }

    return a.countryJa.localeCompare(b.countryJa, "ja");
  });
};

export function CountryQuiz() {
  const [step, setStep] = useState<Step>("select");
  const [answers, setAnswers] = useState<AnswerState>({});
  const [activeCode, setActiveCode] = useState(countriesData[0]?.code ?? "");
  const [region, setRegion] = useState<RegionMode>("all");
  const [answerMode, setAnswerMode] = useState<AnswerMode>("both");
  const [mapReady, setMapReady] = useState(false);

  const quizCountries = useMemo<QuizCountry[]>(() => {
    const filtered =
      region === "all"
        ? countriesData
        : countriesData.filter((country) => country.region === region);

    return sortSpatially(filtered, region).map((country, index) => ({
      ...country,
      quizNumber: index + 1,
    }));
  }, [region]);

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
        };

        setAnswers(saved.answers ?? {});
        setRegion(saved.region ?? "all");
        setAnswerMode(saved.answerMode ?? "both");
        setActiveCode(saved.activeCode ?? countriesData[0]?.code ?? "");
        setStep(saved.step === "result" ? "result" : saved.step ?? "select");
      } catch {
        setStep("select");
      } finally {
        setMapReady(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ answers, activeCode, region, answerMode, step })
        );
      } catch {
        // localStorage may be unavailable in private browsing modes.
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [answers, activeCode, region, answerMode, step]);

  useEffect(() => {
    if (!quizCountries.some((country) => country.code === activeCode)) {
      const timer = window.setTimeout(() => {
        setActiveCode(quizCountries[0]?.code ?? "");
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [activeCode, quizCountries]);

  const visibleFields = getVisibleFields(answerMode);

  const stats = useMemo(() => {
    const rows = quizCountries.map((country) =>
      getRowStatus(country, answers[country.code], answerMode)
    );

    return {
      score: rows.filter((row) => row.complete).length,
      countryScore: quizCountries.filter((country) =>
        isCorrect(answers[country.code]?.country ?? "", country.countryAnswers)
      ).length,
      capitalScore: quizCountries.filter((country) =>
        isCorrect(answers[country.code]?.capital ?? "", country.capitalAnswers)
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

  const startQuiz = () => {
    setAnswers((current) => {
      const next = { ...current };
      quizCountries.forEach((country) => {
        delete next[country.code];
      });
      return next;
    });
    setActiveCode(quizCountries[0]?.code ?? "");
    setStep("quiz");
  };

  const resetCurrentAnswers = () => {
    setAnswers((current) => {
      const next = { ...current };
      quizCountries.forEach((country) => {
        delete next[country.code];
      });
      return next;
    });
    setActiveCode(quizCountries[0]?.code ?? "");
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
                  onClick={() => setRegion(mode)}
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
              {(Object.keys(answerModeLabels) as AnswerMode[]).map((mode) => (
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
            onClick={() => setStep("select")}
            type="button"
          >
            <ArrowLeft size={18} />
            モード選択
          </button>
          <div>
            <strong>{regionLabels[region]}</strong>
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
          onClick={() => setStep("select")}
          type="button"
        >
          <ArrowLeft size={18} />
          モード選択
        </button>
        <div>
          <strong>{regionLabels[region]}</strong>
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
            onClick={() => setStep("result")}
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
