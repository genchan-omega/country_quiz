import {
  createShareResultImage,
  shareImageSize,
} from "@/app/components/ShareResultImage";
import type { SharePageParams } from "@/app/components/ShareResultRoute";
import { parseShareRoute } from "@/app/lib/share-route";

export const size = shareImageSize;
export const contentType = "image/png";

export default async function ShareResultImage({
  params,
}: {
  params: Promise<SharePageParams>;
}) {
  const result = parseShareRoute(await params) ?? {
    region: "all" as const,
    answerMode: "both" as const,
    quizDirection: "write" as const,
    score: 0,
    total: 1,
  };

  return createShareResultImage(result);
}
