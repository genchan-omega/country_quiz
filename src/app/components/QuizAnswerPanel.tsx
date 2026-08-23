import type { KeyboardEvent } from "react";
import type { AnswerState } from "../lib/answer-check";
import type {
  AnswerMode,
  QuizCountry,
  QuizDirection,
  VisibleFields,
} from "../lib/quiz-config";
import type { LocationAnswerState } from "../lib/quiz-storage";

type Props = {
  quizDirection: QuizDirection;
  answerMode: AnswerMode;
  countries: QuizCountry[];
  promptCountries: QuizCountry[];
  activeCountry?: QuizCountry;
  answers: AnswerState;
  locationAnswers: LocationAnswerState;
  getFields: (code: string) => VisibleFields;
  onSelectCountry: (code: string) => void;
  onUpdateAnswer: (
    code: string,
    field: "country" | "capital",
    value: string
  ) => void;
  onInputKeyDown: (
    event: KeyboardEvent<HTMLInputElement>,
    code: string,
    field: "country" | "capital"
  ) => void;
  onFinish: () => void;
  registerRow: (code: string, element: HTMLElement | null) => void;
  registerInput: (key: string, element: HTMLInputElement | null) => void;
  registerSubmit: (element: HTMLButtonElement | null) => void;
};

export default function QuizAnswerPanel({
  quizDirection,
  answerMode,
  countries,
  promptCountries,
  activeCountry,
  answers,
  locationAnswers,
  getFields,
  onSelectCountry,
  onUpdateAnswer,
  onInputKeyDown,
  onFinish,
  registerRow,
  registerInput,
  registerSubmit,
}: Props) {
  const mapNumberByCode = new Map(
    countries.map((country) => [country.code, country.quizNumber])
  );

  return (
    <div className="input-panel">
      <div className="panel-title">
        <h2>{quizDirection === "map" ? "地図で選択" : "回答欄"}</h2>
        <span>{countries.length}カ国</span>
      </div>

      {quizDirection === "map" ? (
        <div className="input-list map-question-list">
          {promptCountries.map((country, index) => {
            const selectedCode = locationAnswers[country.code];
            return (
              <button
                aria-pressed={activeCountry?.code === country.code}
                className={
                  "map-question-row " +
                  (activeCountry?.code === country.code ? "active" : "")
                }
                key={country.code}
                onClick={() => onSelectCountry(country.code)}
                ref={(element) => registerRow(country.code, element)}
                type="button"
              >
                <span className="question-index">Q{index + 1}</span>
                <span className="map-question-prompt">
                  {answerMode === "country" ? (
                    <strong>{country.countryJa}</strong>
                  ) : answerMode === "capital" ? (
                    <strong>{country.capitalJa}</strong>
                  ) : (
                    <>
                      <strong>{country.countryJa}</strong>
                      <small>{country.capitalJa}</small>
                    </>
                  )}
                </span>
                <span
                  className={
                    selectedCode ? "map-answer selected" : "map-answer"
                  }
                >
                  {selectedCode
                    ? "No." + (mapNumberByCode.get(selectedCode) ?? "-")
                    : "未選択"}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="input-list">
          {countries.map((country) => {
            const fields = getFields(country.code);
            return (
              <div
                className={
                  "answer-row " +
                  (activeCountry?.code === country.code ? "active" : "")
                }
                key={country.code}
                ref={(element) => registerRow(country.code, element)}
              >
                <button
                  className="answer-number"
                  onClick={() => onSelectCountry(country.code)}
                  type="button"
                >
                  {country.quizNumber}
                </button>
                <div className="answer-fields">
                  {fields.country ? (
                    <label>
                      <span>国名</span>
                      <input
                        autoComplete="off"
                        enterKeyHint="next"
                        inputMode="text"
                        onChange={(event) =>
                          onUpdateAnswer(
                            country.code,
                            "country",
                            event.target.value
                          )
                        }
                        onFocus={() => onSelectCountry(country.code)}
                        onKeyDown={(event) =>
                          onInputKeyDown(event, country.code, "country")
                        }
                        placeholder="国名"
                        ref={(element) =>
                          registerInput(country.code + ":country", element)
                        }
                        type="text"
                        value={answers[country.code]?.country ?? ""}
                      />
                    </label>
                  ) : null}
                  {fields.capital ? (
                    <label>
                      <span>首都</span>
                      <input
                        autoComplete="off"
                        enterKeyHint="next"
                        inputMode="text"
                        onChange={(event) =>
                          onUpdateAnswer(
                            country.code,
                            "capital",
                            event.target.value
                          )
                        }
                        onFocus={() => onSelectCountry(country.code)}
                        onKeyDown={(event) =>
                          onInputKeyDown(event, country.code, "capital")
                        }
                        placeholder="首都"
                        ref={(element) =>
                          registerInput(country.code + ":capital", element)
                        }
                        type="text"
                        value={answers[country.code]?.capital ?? ""}
                      />
                    </label>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        className="submit-button"
        onClick={onFinish}
        ref={registerSubmit}
        type="button"
      >
        答え合わせ
      </button>
    </div>
  );
}
