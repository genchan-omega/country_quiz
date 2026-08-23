export const createShareText = ({
  scope,
  mode,
  score,
  total,
  url,
}: {
  scope: string;
  mode: string;
  score: number;
  total: number;
  url: string;
}) =>
  `世界の国名・首都クイズ ${scope} ${mode}で ${score}/${total} 正解しました。\n#世界地図クイズ #地理クイズ\n${url}`;
