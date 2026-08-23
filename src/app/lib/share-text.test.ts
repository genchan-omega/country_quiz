import { describe, expect, it } from "vitest";
import { createShareText } from "./share-text";

describe("share text", () => {
  it("puts hashtags before the URL on separate lines", () => {
    expect(
      createShareText({
        scope: "全地域",
        mode: "国名のみ",
        score: 16,
        total: 196,
        url: "https://countryquiz-rho.vercel.app/share/all/country/16/196",
      })
    ).toBe(
      "世界の国名・首都クイズ 全地域 国名のみで 16/196 正解しました。\n" +
        "#世界地図クイズ #地理クイズ\n" +
        "https://countryquiz-rho.vercel.app/share/all/country/16/196"
    );
  });
});
