import { ImageResponse } from "next/og";
import {
  answerModeBySlug,
  answerModeLabels,
  regionBySlug,
  regionLabels,
  siteTitle,
} from "@/app/lib/quiz-config";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

type Props = {
  params: Promise<{
    region: string;
    mode: string;
    score: string;
    total: string;
  }>;
};

export default async function ShareResultImage({ params }: Props) {
  const raw = await params;
  const region = regionBySlug[raw.region] ?? "all";
  const answerMode = answerModeBySlug[raw.mode] ?? "both";
  const score = Math.max(0, Number(raw.score) || 0);
  const total = Math.max(1, Number(raw.total) || 1);
  const percent = Math.round((score / total) * 100);

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
                  color: "#6c746c",
                  fontSize: 48,
                  fontWeight: 900,
                  lineHeight: 1.08,
                  paddingBottom: 8,
                }}
              >
                /{total}
                <br />
                正解
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 14,
                color: "#064c49",
                fontSize: 32,
                fontWeight: 900,
              }}
            >
              <span>{regionLabels[region]}</span>
              <span>・</span>
              <span>{answerModeLabels[answerMode]}</span>
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
    size
  );
}
