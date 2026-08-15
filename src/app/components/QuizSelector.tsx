import {
  Play,
  Target,
} from "lucide-react";
import {
  answerModeLabels,
  answerModeOrder,
  getRegionCountries,
  questionCountLabels,
  questionCountOrder,
  regionLabels,
  regionOrder,
  type AnswerMode,
  type QuestionCount,
  type RegionMode,
} from "../lib/quiz-config";
import { getWeakFields, getWeakItemMisses, type WeakListItem } from "../lib/weak-list";

type Props = {
  region: RegionMode;
  answerMode: AnswerMode;
  questionCount: QuestionCount;
  weakItems: WeakListItem[];
  onRegionChange: (region: RegionMode) => void;
  onAnswerModeChange: (answerMode: AnswerMode) => void;
  onQuestionCountChange: (questionCount: QuestionCount) => void;
  onStart: () => void;
  onStartWeak: () => void;
};

export default function QuizSelector({
  region,
  answerMode,
  questionCount,
  weakItems,
  onRegionChange,
  onAnswerModeChange,
  onQuestionCountChange,
  onStart,
  onStartWeak,
}: Props) {
  const regionCount = (selectedRegion: RegionMode) =>
    getRegionCountries(selectedRegion).length;

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
            {regionOrder.map((selectedRegion) => (
              <button
                className={`mode-card ${region === selectedRegion ? "selected" : ""}`}
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
          <h2>問題数</h2>
          <div className="mode-grid question-count-grid">
            {questionCountOrder.map((count) => (
              <button
                className={`mode-card ${questionCount === count ? "selected" : ""}`}
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
            <span>{weakItems.length}カ国</span>
          </div>
          {weakItems.length ? (
            <div className="weak-list-preview" aria-label="苦手リスト">
              {weakItems.slice(0, 6).map((item) => (
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
          <button
            className="secondary-action"
            disabled={!weakItems.length}
            onClick={onStartWeak}
            type="button"
          >
            <Target size={18} />
            苦手だけ復習
          </button>
        </div>

        <button className="primary-action" onClick={onStart} type="button">
          <Play size={18} />
          開始
        </button>
      </section>
    </main>
  );
}
