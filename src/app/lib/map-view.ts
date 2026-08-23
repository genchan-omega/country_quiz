export type HorizontalPoint = { x: number };

export const unwrapDatelinePoints = <T extends HorizontalPoint>(
  points: T[],
  worldWidth: number
): { points: T[]; wrapsDateline: boolean } => {
  if (points.length < 2 || worldWidth <= 0) {
    return { points, wrapsDateline: false };
  }

  const sorted = [...points].sort((a, b) => a.x - b.x);
  let largestGap = -1;
  let intervalStart = sorted[0].x;

  sorted.forEach((point, index) => {
    const next = sorted[(index + 1) % sorted.length];
    const nextX = index === sorted.length - 1 ? next.x + worldWidth : next.x;
    const gap = nextX - point.x;
    if (gap > largestGap) {
      largestGap = gap;
      intervalStart = next.x;
    }
  });

  const rawSpan = sorted.at(-1)!.x - sorted[0].x;
  const wrappedSpan = worldWidth - largestGap;
  const wrapsDateline =
    rawSpan > worldWidth * 0.65 && wrappedSpan < worldWidth * 0.55;

  if (!wrapsDateline) {
    return { points, wrapsDateline: false };
  }

  return {
    points: points.map((point) => ({
      ...point,
      x: point.x < intervalStart ? point.x + worldWidth : point.x,
    })),
    wrapsDateline: true,
  };
};
