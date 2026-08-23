import { describe, expect, it } from "vitest";
import { unwrapDatelinePoints } from "./map-view";

describe("map view", () => {
  it("keeps ordinary regional points in the standard world copy", () => {
    const result = unwrapDatelinePoints(
      [
        { id: "west", x: 250 },
        { id: "middle", x: 500 },
        { id: "east", x: 720 },
      ],
      1000
    );

    expect(result.wrapsDateline).toBe(false);
    expect(result.points.map((point) => point.x)).toEqual([250, 500, 720]);
  });

  it("joins Pacific points split by the map edge", () => {
    const result = unwrapDatelinePoints(
      [
        { id: "samoa", x: 25 },
        { id: "kiribati", x: 65 },
        { id: "australia", x: 870 },
        { id: "new-zealand", x: 980 },
      ],
      1000
    );

    expect(result.wrapsDateline).toBe(true);
    expect(result.points).toEqual([
      { id: "samoa", x: 1025 },
      { id: "kiribati", x: 1065 },
      { id: "australia", x: 870 },
      { id: "new-zealand", x: 980 },
    ]);
  });

  it("does not rotate a near-global set", () => {
    const result = unwrapDatelinePoints(
      [
        { x: 15 },
        { x: 180 },
        { x: 350 },
        { x: 520 },
        { x: 690 },
        { x: 850 },
        { x: 985 },
      ],
      1000
    );

    expect(result.wrapsDateline).toBe(false);
  });
});
