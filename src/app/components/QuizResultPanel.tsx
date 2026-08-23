import { Check, CircleHelp, CircleX } from "lucide-react";
import countriesData from "@/data/countries.json";
import {
  getLocationStatus,
  getRowStatusForFields,
  isHistoricalAnswer,
  type AnswerState,
} from "../lib/answer-check";
import type {
  QuizCountry,
  QuizDirection,
  VisibleFields,
} from "../lib/quiz-config";
import type { LocationAnswerState } from "../lib/quiz-storage";

export type ResultFilter = "all" | "incorrect" | "unanswered" | "correct";
export type ResultCounts = Record<ResultFilter, number>;

type Props = {
  quizDirection: QuizDirection;
  countries: QuizCountry[];
  activeCountry?: QuizCountry;
  answers: AnswerState;
  locationAnswers: LocationAnswerState;
  mapNumberByCode: Map<string, number>;
  resultFilter: ResultFilter;
  resultCounts: ResultCounts;
  getFields: (code: string) => VisibleFields;
  onFilterChange: (filter: ResultFilter) => void;
  onSelectCountry: (code: string) => void;
  registerRow: (code: string, element: HTMLElement | null) => void;
};

const filterLabels: Record<ResultFilter, string> = {
  all: "すべて",
  incorrect: "不正解",
  unanswered: "未回答",
  correct: "正解",
};

export default function QuizResultPanel({
  quizDirection,
  countries,
  activeCountry,
  answers,
  locationAnswers,
  mapNumberByCode,
  resultFilter,
  resultCounts,
  getFields,
  onFilterChange,
  onSelectCountry,
  registerRow,
}: Props) {
  return (
    <div className="input-panel result-panel">
      <div className="panel-title result-panel-title">
        <h2>答え合わせ</h2>
        <div className="result-filters" aria-label="回答の絞り込み">
          {(Object.keys(filterLabels) as ResultFilter[]).map((filter) => (
            <button
              aria-pressed={resultFilter === filter}
              className={resultFilter === filter ? "selected" : ""}
              key={filter}
              onClick={() => onFilterChange(filter)}
              type="button"
            >
              {filterLabels[filter]} {resultCounts[filter]}
            </button>
          ))}
        </div>
      </div>
      <div className="result-list" aria-label="回答一覧">
        {countries.length ? (
          countries.map((country) => {
            const answer = answers[country.code] ?? {
              country: "",
              capital: "",
            };
            const fields = getFields(country.code);
            const rowStatus = getRowStatusForFields(country, answer, fields);
            const locationStatus = getLocationStatus(
              locationAnswers[country.code],
              country
            );
            const overallStatus =
              quizDirection === "map"
                ? locationStatus
                : !rowStatus.attempted
                  ? "unanswered"
                  : rowStatus.complete
                    ? "correct"
                    : "incorrect";
            const selectedCountry = countriesData.find(
              (item) => item.code === locationAnswers[country.code]
            );

            return (
              <button
                className={
                  "result-row " +
                  (activeCountry?.code === country.code ? "active" : "")
                }
                key={country.code}
                onClick={() => onSelectCountry(country.code)}
                ref={(element) => registerRow(country.code, element)}
                type="button"
              >
                <span className={"result-number " + overallStatus}>
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
                  {quizDirection === "map" ? (
                    <div className={"answer-check " + locationStatus}>
                      <span>位置</span>
                      <strong>
                        正解: No.{country.quizNumber} {country.countryJa}
                      </strong>
                      <small>
                        回答:{" "}
                        {selectedCountry
                          ? "No." +
                            (mapNumberByCode.get(selectedCountry.code) ?? "-") +
                            " " +
                            selectedCountry.countryJa
                          : "未回答"}
                      </small>
                    </div>
                  ) : (
                    <>
                      {fields.country ? (
                        <div
                          className={
                            "answer-check " + rowStatus.countryStatus
                          }
                        >
                          <span>国名</span>
                          <strong>正解: {country.countryJa}</strong>
                          <small>回答: {answer.country || "未回答"}</small>
                          {isHistoricalAnswer(
                            answer.country,
                            country,
                            "country"
                          ) ? (
                            <small className="answer-note">
                              以前の表記です。現在の名称は「{country.countryJa}」です。
                            </small>
                          ) : null}
                        </div>
                      ) : null}
                      {fields.capital ? (
                        <div
                          className={
                            "answer-check " + rowStatus.capitalStatus
                          }
                        >
                          <span>首都</span>
                          <strong>正解: {country.capitalJa}</strong>
                          <small>回答: {answer.capital || "未回答"}</small>
                          {isHistoricalAnswer(
                            answer.capital,
                            country,
                            "capital"
                          ) ? (
                            <small className="answer-note">
                              旧首都です。現在の首都は「{country.capitalJa}」です。
                            </small>
                          ) : null}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </button>
            );
          })
        ) : (
          <p className="result-empty">該当する回答はありません。</p>
        )}
      </div>
    </div>
  );
}
