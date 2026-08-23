import {
  BookOpenCheck,
  History,
  Keyboard,
  MapPinned,
  Play,
  Target,
} from "lucide-react";
import {
  answerModeLabels,
  answerModeOrder,
  getRegionCountries,
  questionCountLabels,
  questionCountOrder,
  quizDirectionLabels,
  quizDirectionOrder,
  regionLabels,
  regionOrder,
  type AnswerMode,
  type QuestionCount,
  type QuizDirection,
  type RegionMode,
} from "../lib/quiz-config";
import {
  getWeakFieldCounts,
  getWeakFields,
  getWeakItemMisses,
  type WeakListItem,
} from "../lib/weak-list";

export type ResumeSummary = {
  scope: string;
  mode: string;
  direction: string;
  count: number;
  step: "quiz" | "result";
};

type Props = {
  region: RegionMode;
  answerMode: AnswerMode;
  quizDirection: QuizDirection;
  questionCount: QuestionCount;
  weakItems: WeakListItem[];
  dailyReviewCount: number;
  resumeSummary?: ResumeSummary;
  onRegionChange: (region: RegionMode) => void;
  onAnswerModeChange: (answerMode: AnswerMode) => void;
  onQuizDirectionChange: (quizDirection: QuizDirection) => void;
  onQuestionCountChange: (questionCount: QuestionCount) => void;
  onStart: () => void;
  onStartWeak: () => void;
  onStartDailyReview: () => void;
  onResume: () => void;
};

export default function QuizSelector({
  region,
  answerMode,
  quizDirection,
  questionCount,
  weakItems,
  dailyReviewCount,
  resumeSummary,
  onRegionChange,
  onAnswerModeChange,
  onQuizDirectionChange,
  onQuestionCountChange,
  onStart,
  onStartWeak,
  onStartDailyReview,
  onResume,
}: Props) {
  const regionCount = (selectedRegion: RegionMode) =>
    getRegionCountries(selectedRegion).length;
  const weakCounts = getWeakFieldCounts(weakItems);
  const availableWeakCount =
    quizDirection === "write"
      ? weakItems.filter((item) => item.country.weak || item.capital.weak).length
      : weakCounts.location;

  return (
    <main className="select-screen">
      <section className="select-panel" aria-labelledby="app-title">
        <div className="brand-block">
          <p>World Map Quiz</p>
          <h1 id="app-title">世界の国名・首都クイズ</h1>
        </div>

        {resumeSummary ? (
          <button className="resume-action" onClick={onResume} type="button">
            <History size={18} />
            <span>
              <strong>前回の続き</strong>
              <small>
                {resumeSummary.scope}・{resumeSummary.mode}・
                {resumeSummary.direction}・{resumeSummary.count}問・
                {resumeSummary.step === "result" ? "結果" : "回答途中"}
              </small>
            </span>
          </button>
        ) : null}

        <div className="select-section">
          <h2>地域</h2>
          <div className="mode-grid">
            {regionOrder.map((selectedRegion) => (
              <button
                className={`mode-card ${region === selectedRegion ? "selected" : ""}`}
                aria-pressed={region === selectedRegion}
                key={selectedRegion}
                onClick={() => onRegionChange(selectedRegion)}
                type="button"
              >
                <strong>{regionLabels[selectedRegion]}</strong>
                <span>{regionCount(selectedRegion)}カ国</span>
              </button>
            ))}
          </div>
        </div>

        <div className="select-section">
          <h2>出題</h2>
          <div className="mode-grid answer-mode-grid">
            {answerModeOrder.map((selectedMode) => (
              <button
                className={`mode-card ${answerMode === selectedMode ? "selected" : ""}`}
                aria-pressed={answerMode === selectedMode}
                key={selectedMode}
                onClick={() => onAnswerModeChange(selectedMode)}
                type="button"
              >
                <strong>{answerModeLabels[selectedMode]}</strong>
              </button>
            ))}
          </div>
        </div>

        <div className="select-section">
          <h2>回答方法</h2>
          <div className="mode-grid direction-grid">
            {quizDirectionOrder.map((direction) => (
              <button
                aria-pressed={quizDirection === direction}
                className={`mode-card direction-card ${quizDirection === direction ? "selected" : ""}`}
                key={direction}
                onClick={() => onQuizDirectionChange(direction)}
                type="button"
              >
                {direction === "write" ? (
                  <Keyboard aria-hidden="true" size={19} />
                ) : (
                  <MapPinned aria-hidden="true" size={19} />
                )}
                <strong>{quizDirectionLabels[direction]}</strong>
              </button>
            ))}
          </div>
        </div>

        <div className="select-section">
          <h2>問題数</h2>
          <div className="mode-grid question-count-grid">
            {questionCountOrder.map((count) => (
              <button
                className={`mode-card ${questionCount === count ? "selected" : ""}`}
                aria-pressed={questionCount === count}
                key={count}
                onClick={() => onQuestionCountChange(count)}
                type="button"
              >
                <strong>{questionCountLabels[count]}</strong>
                <span>
                  {count === "all"
                    ? `${regionCount(region)}問`
                    : `${Math.min(count, regionCount(region))}問をランダム出題`}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="select-section weak-section">
          <div className="weak-heading">
            <h2>苦手リスト</h2>
            <span>
              国名 {weakCounts.country}・首都 {weakCounts.capital}・位置{" "}
              {weakCounts.location}
            </span>
          </div>
          {weakItems.length ? (
            <div className="weak-list-preview" aria-label="苦手リスト">
              {weakItems.slice(0, 4).map((item) => (
                <span key={item.code}>
                  {item.countryJa}
                  <small>
                    {getWeakFields(item).join("・")} {getWeakItemMisses(item)}回
                  </small>
                </span>
              ))}
            </div>
          ) : (
            <p className="weak-empty">間違えた国がここに保存されます。</p>
          )}
          <div className="study-actions">
            <button
              className="secondary-action"
              disabled={!availableWeakCount}
              onClick={onStartWeak}
              type="button"
            >
              <Target size={18} />
              苦手に合わせて復習
            </button>
            <button
              className="secondary-action"
              disabled={!dailyReviewCount}
              onClick={onStartDailyReview}
              type="button"
            >
              <BookOpenCheck size={18} />
              今日の復習 {dailyReviewCount ? `${dailyReviewCount}問` : ""}
            </button>
          </div>
        </div>

        <div className="select-primary-actions">
          <button className="primary-action" onClick={onStart} type="button">
            <Play size={18} />
            開始
          </button>
        </div>
      </section>
    </main>
  );
}
