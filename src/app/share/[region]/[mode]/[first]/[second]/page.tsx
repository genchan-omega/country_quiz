import type { Metadata } from "next";
import {
  createShareMetadata,
  renderShareResult,
  resolveShareParams,
  type SharePageParams,
} from "@/app/components/ShareResultRoute";

type Props = { params: Promise<SharePageParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createShareMetadata(await resolveShareParams(params));
}

export default async function ShareResultPage({ params }: Props) {
  return renderShareResult(await resolveShareParams(params));
}
