import type { DownloadsData } from "~/lib/downloads-utils";
import { getDownloadsData } from "~/lib/downloads";
import LandingPageClient from "./_components/landing-page-client";

export default async function LandingPage() {
  let downloadsData: DownloadsData | null = null;
  let downloadError: string | undefined;

  try {
    downloadsData = await getDownloadsData();
  } catch (err) {
    downloadError =
      err instanceof Error ? err.message : "Unable to load download data";
    console.error("Failed to fetch downloads data:", err);
  }

  return (
    <LandingPageClient
      downloadsData={downloadsData}
      downloadError={downloadError}
    />
  );
}
