import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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
              padding: "72px 64px",
            }}
          >
            <div
              style={{
                color: "#0b6e69",
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: 0,
                marginBottom: 22,
              }}
            >
              WORLD MAP QUIZ
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: 64,
                fontWeight: 900,
                lineHeight: 1.12,
                letterSpacing: 0,
                marginBottom: 28,
              }}
            >
              世界196カ国
              <br />
              国名・首都名クイズ
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                color: "#6c746c",
                fontSize: 30,
                lineHeight: 1.45,
                fontWeight: 700,
              }}
            >
              白地図で位置を確認しながら
              <br />
              国名と首都を入力して学習できます
            </div>
          </div>
          <div
            style={{
              width: 410,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#eef5f0",
              position: "relative",
            }}
          >
            <div
              style={{
                width: 260,
                height: 260,
                borderRadius: "50%",
                background: "#ffffff",
                border: "10px solid #0b6e69",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  width: 210,
                  height: 8,
                  background: "#0b6e69",
                  borderRadius: 999,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  width: 8,
                  height: 210,
                  background: "#0b6e69",
                  borderRadius: 999,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: 26,
                  top: 28,
                  width: 82,
                  height: 82,
                  borderRadius: "50%",
                  background: "#d9653b",
                  color: "#fffdfa",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 34,
                  fontWeight: 900,
                }}
              >
                01
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
