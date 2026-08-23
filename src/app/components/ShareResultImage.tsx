import { ImageResponse } from "next/og";
import {
  answerModeLabels,
  quizDirectionLabels,
  regionLabels,
  siteTitle,
  type AnswerMode,
  type QuizDirection,
  type RegionMode,
} from "../lib/quiz-config";

export const shareImageSize = {
  width: 1200,
  height: 630,
};

type Props = {
  region: RegionMode;
  answerMode: AnswerMode;
  quizDirection: QuizDirection;
  score: number;
  total: number;
};

export const createShareResultImage = ({
  region,
  answerMode,
  quizDirection,
  score,
  total,
}: Props) => {
  const percent = Math.round((score / total) * 100);
  const modeLabel =
    answerModeLabels[answerMode] +
    (quizDirection === "map" ? "・" + quizDirectionLabels.map : "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f7f6f2",
          color: "#1f2420",
          fontFamily: "Arial, sans-serif",
          padding: 58,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            border: "2px solid #d8ded5",
            borderRadius: 24,
            background: "#fffdfa",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "62px 68px",
            }}
          >
            <div
              style={{
                display: "flex",
                color: "#0b6e69",
                fontSize: 28,
                fontWeight: 900,
                letterSpacing: 0,
                marginBottom: 24,
              }}
            >
              {siteTitle}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 20,
                marginBottom: 26,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 118,
                  fontWeight: 900,
                  lineHeight: 0.92,
                  letterSpacing: 0,
                }}
              >
                {score}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  color: "#6c746c",
                  fontSize: 48,
                  fontWeight: 900,
                  lineHeight: 1.08,
                  paddingBottom: 8,
                }}
              >
                <span>/{total}</span>
                <span>正解</span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 14,
                color: "#064c49",
                fontSize: 30,
                fontWeight: 900,
              }}
            >
              <span>{regionLabels[region]}</span>
              <span>・</span>
              <span>{modeLabel}</span>
            </div>
          </div>
          <div
            style={{
              width: 390,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#eef5f0",
              position: "relative",
            }}
          >
            <div
              style={{
                width: 245,
                height: 245,
                borderRadius: "50%",
                border: "14px solid #0b6e69",
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#d9653b",
                fontSize: 72,
                fontWeight: 900,
              }}
            >
              {percent}%
            </div>
          </div>
        </div>
      </div>
    ),
    shareImageSize
  );
};
