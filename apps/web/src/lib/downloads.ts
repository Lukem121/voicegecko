import { Octokit } from "@octokit/rest";

import type {
  DownloadAsset,
  DownloadsData,
  PlatformDownloads,
} from "./downloads-utils";
import type { GitHubRelease, TauriTarget } from "~/types/updater";
import { env } from "~/env";
import { PLATFORM_FILE_EXTENSIONS } from "~/types/updater";

// Configuration - using the public releases repository
const RELEASES_GITHUB_OWNER = "Lukem121";
const RELEASES_GITHUB_REPO = "voicegecko-releases";

// Initialize GitHub client
const octokit = new Octokit({
  auth: env.GITHUB_TOKEN,
  userAgent: "VoiceGecko-Downloads/1.0",
});

/**
 * Fetch the latest release from the public releases repository
 */
async function fetchLatestRelease(): Promise<GitHubRelease | null> {
  try {
    const { data } = await octokit.rest.repos.getLatestRelease({
      owner: RELEASES_GITHUB_OWNER,
      repo: RELEASES_GITHUB_REPO,
    });

    return data as GitHubRelease;
  } catch (error: any) {
    if (error.status === 404) {
      // No published releases found, check all releases
      try {
        const { data: releases } = await octokit.rest.repos.listReleases({
          owner: RELEASES_GITHUB_OWNER,
          repo: RELEASES_GITHUB_REPO,
          per_page: 1,
        });

        return releases.length > 0 ? (releases[0] as GitHubRelease) : null;
      } catch (listError) {
        console.error("Error fetching releases list:", listError);
        return null;
      }
    }

    throw new Error(
      `GitHub API error: ${error.status} ${error.message || "Unknown error"}`,
    );
  }
}

/**
 * Process release data into the format needed for the downloads page
 */
function processReleaseForDownloads(release: GitHubRelease): DownloadsData {
  const platforms = {
    windows: processAssetsForPlatform(release.assets, "windows-x86_64"),
    macos: {
      available: false,
      assets: [
        ...processAssetsForPlatform(release.assets, "darwin-x86_64").assets,
        ...processAssetsForPlatform(release.assets, "darwin-aarch64").assets,
      ],
    },
    linux: processAssetsForPlatform(release.assets, "linux-x86_64"),
  };

  // Check if macOS has any available assets
  platforms.macos.available = platforms.macos.assets.length > 0;

  return {
    version: normalizeVersion(release.tag_name),
    publishedAt: release.published_at,
    releaseNotes: release.body || undefined,
    platforms,
  };
}

/**
 * Process assets for a specific platform
 */
function processAssetsForPlatform(
  assets: GitHubRelease["assets"],
  platform: TauriTarget,
): PlatformDownloads {
  const supportedExtensions = PLATFORM_FILE_EXTENSIONS[platform];

  const platformAssets = assets
    .filter(
      (asset) =>
        supportedExtensions.some((ext) => asset.name.endsWith(ext)) &&
        !asset.name.endsWith(".sig"), // Exclude signature files from download list
    )
    .map((asset) => ({
      name: asset.name,
      url: asset.browser_download_url,
      size: asset.size,
      contentType: asset.content_type,
    }));

  return {
    available: platformAssets.length > 0,
    assets: platformAssets,
  };
}

/**
 * Normalize version string (remove prefixes like 'app-v' or 'v')
 */
function normalizeVersion(version: string): string {
  if (version.startsWith("app-v")) {
    return version.slice(5);
  }
  if (version.startsWith("v")) {
    return version.slice(1);
  }
  return version;
}

/**
 * Main function to get downloads data - can be used both server-side and in API routes
 */
export async function getDownloadsData(): Promise<DownloadsData> {
  // Validate environment configuration
  if (!env.GITHUB_TOKEN) {
    throw new Error("Missing required environment variable: GITHUB_TOKEN");
  }

  // Fetch the latest release from the public releases repository
  const release = await fetchLatestRelease();

  if (!release) {
    throw new Error("No releases found in the releases repository");
  }

  // Process the release data for the downloads page
  return processReleaseForDownloads(release);
}

// Re-export the client-safe utilities
export { formatFileSize, getPrimaryDownload } from "./downloads-utils";
