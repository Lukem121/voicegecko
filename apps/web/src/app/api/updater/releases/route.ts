import { NextResponse } from "next/server";

import type { GitHubRelease, TauriTarget } from "~/types/updater";
import { env } from "~/env";
import { PLATFORM_FILE_EXTENSIONS } from "~/types/updater";

// Environment variables
const GITHUB_TOKEN = env.GITHUB_TOKEN;
const GITHUB_OWNER = env.GITHUB_OWNER;
const GITHUB_REPO = env.GITHUB_REPO;

/**
 * GET /api/updater/releases
 *
 * Returns all GitHub releases with detailed information about assets,
 * platform compatibility, and signatures. Useful for debugging and development.
 */
export async function GET() {
  try {
    // Validate environment configuration
    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONFIG_ERROR",
            message:
              "Missing required environment variables: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO",
          },
        },
        { status: 500 },
      );
    }

    // Fetch all releases from GitHub
    const releases = await fetchAllReleases();

    if (!releases || releases.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          repository: `${GITHUB_OWNER}/${GITHUB_REPO}`,
          releases: [],
          message: "No releases found in repository",
        },
      });
    }

    // Process each release to show platform compatibility
    const processedReleases = releases.map((release) => {
      const platforms: Record<string, any> = {};

      // Check each supported platform
      Object.keys(PLATFORM_FILE_EXTENSIONS).forEach((platform) => {
        const supportedExtensions =
          PLATFORM_FILE_EXTENSIONS[platform as TauriTarget];

        // Find binary assets for this platform
        const binaryAssets = release.assets.filter((asset) =>
          supportedExtensions.some((ext) => asset.name.endsWith(ext)),
        );

        // Check for signature files
        const assetsWithSignatures = binaryAssets.map((binaryAsset) => {
          const signatureAsset = release.assets.find(
            (asset) => asset.name === `${binaryAsset.name}.sig`,
          );

          return {
            name: binaryAsset.name,
            size: binaryAsset.size,
            download_url: binaryAsset.browser_download_url,
            has_signature: !!signatureAsset,
            signature_url: signatureAsset?.browser_download_url,
          };
        });

        platforms[platform] = {
          compatible: binaryAssets.length > 0,
          assets: assetsWithSignatures,
          missing_signatures: assetsWithSignatures.filter(
            (asset) => !asset.has_signature,
          ).length,
        };
      });

      return {
        tag_name: release.tag_name,
        name: release.name,
        published_at: release.published_at,
        prerelease: release.prerelease,
        draft: release.draft,
        total_assets: release.assets.length,
        platforms,
        all_assets: release.assets.map((asset) => ({
          name: asset.name,
          size: asset.size,
          content_type: asset.content_type,
          download_url: asset.browser_download_url,
        })),
      };
    });

    // Summary statistics
    const summary = {
      total_releases: processedReleases.length,
      latest_release: processedReleases[0]?.tag_name,
      platforms_summary: Object.keys(PLATFORM_FILE_EXTENSIONS).reduce(
        (acc, platform) => {
          const compatibleReleases = processedReleases.filter(
            (release) => release.platforms[platform].compatible,
          ).length;
          acc[platform] = {
            compatible_releases: compatibleReleases,
            percentage: Math.round(
              (compatibleReleases / processedReleases.length) * 100,
            ),
          };
          return acc;
        },
        {} as Record<string, unknown>,
      ),
    };

    return NextResponse.json({
      success: true,
      data: {
        repository: `${GITHUB_OWNER}/${GITHUB_REPO}`,
        summary,
        releases: processedReleases,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("rate limit")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "GITHUB_API_ERROR",
            message: "GitHub API rate limit exceeded. Please try again later.",
            details: { retryAfter: 3600 },
          },
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "GITHUB_API_ERROR",
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
      },
      { status: 500 },
    );
  }
}

/**
 * Fetch all releases from GitHub API
 */
async function fetchAllReleases(): Promise<GitHubRelease[] | null> {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "VoiceGecko-Updater/1.0",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(
      `GitHub API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<GitHubRelease[]>;
}
