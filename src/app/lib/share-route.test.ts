import { describe, expect, it } from "vitest";
import { parseShareRoute } from "./share-route";

describe("share route", () => {
  it("parses the existing write result URL", () => {
    expect(
      parseShareRoute({
        region: "europe",
        mode: "country",
        first: "8",
        second: "10",
      })
    ).toMatchObject({
      region: "Europe",
      answerMode: "country",
      quizDirection: "write",
      score: 8,
      total: 10,
    });
  });

  it("parses a map result URL", () => {
    expect(
      parseShareRoute({
        region: "asia",
        mode: "capital",
        first: "map",
        second: "7",
        third: "10",
      })
    ).toMatchObject({
      region: "Asia",
      answerMode: "capital",
      quizDirection: "map",
      score: 7,
      total: 10,
    });
  });

  it("rejects malformed, unknown, and impossible results", () => {
    expect(
      parseShareRoute({
        region: "unknown",
        mode: "country",
        first: "8",
        second: "10",
      })
    ).toBeNull();
    expect(
      parseShareRoute({
        region: "all",
        mode: "both",
        first: "write",
        second: "8",
        third: "10",
      })
    ).toBeNull();
    expect(
      parseShareRoute({
        region: "all",
        mode: "both",
        first: "11",
        second: "10",
      })
    ).toBeNull();
  });
});
