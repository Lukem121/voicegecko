import type { DownloadsData } from "~/lib/downloads-utils";
import { getDownloadsData } from "~/lib/downloads";
import DownloadsPageClient from "./downloads-page-client";

export default async function DownloadsPage() {
  let downloadsData: DownloadsData | null = null;
  let error: string | undefined;

  try {
    downloadsData = await getDownloadsData();
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error occurred";
    console.error("Failed to fetch downloads data:", err);
  }

  return <DownloadsPageClient downloadsData={downloadsData} error={error} />;
}
