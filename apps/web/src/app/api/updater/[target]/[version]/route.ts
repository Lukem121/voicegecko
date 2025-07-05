import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import type {
  GitHubRelease,
  ProcessedAsset,
  TauriTarget,
  TauriUpdaterResponse,
  UpdaterError,
} from "~/types/updater";
import { env } from "~/env";
import { PLATFORM_FILE_EXTENSIONS } from "~/types/updater";

// Environment variables
const GITHUB_TOKEN = env.GITHUB_TOKEN;
const GITHUB_OWNER = env.GITHUB_OWNER;
const GITHUB_REPO = env.GITHUB_REPO;

// Validation schemas
const paramsSchema = z.object({
  target: z.string().min(1),
  version: z.string().min(1),
});

// Platform mappings for simplified names that Tauri might send
const PLATFORM_MAPPINGS: Record<string, TauriTarget> = {
  windows: "windows-x86_64",
  linux: "linux-x86_64",
  darwin: "darwin-x86_64",
  macos: "darwin-x86_64",
  // Keep existing full names as well
  "windows-x86_64": "windows-x86_64",
  "linux-x86_64": "linux-x86_64",
  "darwin-x86_64": "darwin-x86_64",
  "darwin-aarch64": "darwin-aarch64",
} as const;

/**
 * GET /api/updater/[target]/[version]
 *
 * Serves update information for Tauri applications by fetching from GitHub releases
 * and transforming to the expected Tauri updater JSON format.
 *
 * @param target - Platform target (e.g., "windows", "linux", "darwin" or full names)
 * @param version - Current version of the application
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ target: string; version: string }> },
) {
  try {
    // Validate environment configuration
    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
      return createErrorResponse(
        "CONFIG_ERROR",
        "Missing required environment variables: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO",
      );
    }

    const resolvedParams = await params;

    // Validate request parameters
    const result = paramsSchema.safeParse(resolvedParams);
    if (!result.success) {
      return createErrorResponse(
        "INVALID_PLATFORM",
        "Invalid request parameters",
      );
    }

    const { target, version: currentVersion } = result.data;

    // Map platform to standardized target
    const mappedTarget = mapPlatformTarget(target);
    if (!mappedTarget) {
      return createErrorResponse(
        "INVALID_PLATFORM",
        `Unsupported platform: ${target}. Supported platforms: ${Object.keys(PLATFORM_MAPPINGS).join(", ")}`,
      );
    }

    // Fetch latest release from GitHub
    const release = await fetchLatestRelease();

    if (!release) {
      return createErrorResponse(
        "NO_RELEASE_FOUND",
        "No releases found in repository",
      );
    }

    // Check if current version is already latest
    if (
      normalizeVersion(release.tag_name) === normalizeVersion(currentVersion)
    ) {
      return new NextResponse(null, { status: 204 }); // No content - no update available
    }

    // Process assets for the requested platform
    const processedAssets = await processReleaseAssets(release, mappedTarget);

    if (processedAssets.length === 0) {
      return createErrorResponse(
        "NO_RELEASE_FOUND",
        `No compatible assets found for platform: ${mappedTarget}`,
      );
    }

    // Build Tauri updater response
    const updaterResponse = buildTauriResponse(release, processedAssets);

    return NextResponse.json(updaterResponse);
  } catch (error) {
    console.error("[Updater] API Error:", error);

    if (error instanceof Error && error.message.includes("rate limit")) {
      return createErrorResponse(
        "GITHUB_API_ERROR",
        "GitHub API rate limit exceeded. Please try again later.",
        { retryAfter: 3600 },
      );
    }

    return createErrorResponse(
      "GITHUB_API_ERROR",
      error instanceof Error ? error.message : "Unknown error occurred",
    );
  }
}

/**
 * Fetch the latest release from GitHub API
 * In development, this will also consider draft releases
 */
async function fetchLatestRelease(): Promise<GitHubRelease | null> {
  // First try the /releases/latest endpoint (excludes drafts)
  const latestUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

  try {
    const latestResponse = await fetch(latestUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "VoiceGecko-Updater/1.0",
      },
    });

    if (latestResponse.ok) {
      return latestResponse.json();
    }
  } catch {
    // Silently fallback to all releases
  }

  // Fallback: fetch all releases and find the latest (includes drafts for development)
  const allReleasesUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;

  const allResponse = await fetch(allReleasesUrl, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "VoiceGecko-Updater/1.0",
    },
  });

  if (!allResponse.ok) {
    if (allResponse.status === 404) {
      return null;
    }
    throw new Error(
      `GitHub API error: ${allResponse.status} ${allResponse.statusText}`,
    );
  }

  const allReleases = (await allResponse.json()) as GitHubRelease[];

  if (!allReleases?.length) {
    return null;
  }

  // Find the latest release (published releases first, then drafts if needed)
  const publishedReleases = allReleases.filter((release) => !release.draft);
  const latestRelease =
    publishedReleases.length > 0 ? publishedReleases[0] : allReleases[0];

  return latestRelease || null;
}

/**
 * Process release assets and find matching platform binaries with signatures
 */
async function processReleaseAssets(
  release: GitHubRelease,
  targetPlatform: TauriTarget,
): Promise<ProcessedAsset[]> {
  const assets: ProcessedAsset[] = [];
  const supportedExtensions = PLATFORM_FILE_EXTENSIONS[targetPlatform];

  // Find binary assets for the target platform
  const binaryAssets = release.assets.filter((asset) =>
    supportedExtensions.some((ext) => asset.name.endsWith(ext)),
  );

  for (const binaryAsset of binaryAssets) {
    // Look for corresponding signature file
    const signatureAsset = release.assets.find(
      (asset) => asset.name === `${binaryAsset.name}.sig`,
    );

    if (!signatureAsset) {
      continue;
    }

    // Fetch the signature content
    try {
      const signature = await fetchSignatureContent(
        signatureAsset.browser_download_url,
      );

      assets.push({
        platform: targetPlatform,
        url: binaryAsset.browser_download_url,
        signature,
      });
    } catch {
      // Skip assets that fail signature fetch
    }
  }

  return assets;
}

/**
 * Fetch signature file content from GitHub
 */
async function fetchSignatureContent(signatureUrl: string): Promise<string> {
  const response = await fetch(signatureUrl, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "VoiceGecko-Updater/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch signature: ${response.status} ${response.statusText}`,
    );
  }

  return response.text();
}

/**
 * Build Tauri updater response format
 */
function buildTauriResponse(
  release: GitHubRelease,
  assets: ProcessedAsset[],
): TauriUpdaterResponse {
  const platforms: Record<string, { signature: string; url: string }> = {};

  for (const asset of assets) {
    if (!asset.signature) {
      continue;
    }

    platforms[asset.platform] = {
      signature: asset.signature,
      url: asset.url,
    };
  }

  return {
    version: normalizeVersion(release.tag_name),
    notes: release.body || undefined,
    pub_date: release.published_at,
    platforms,
  };
}

/**
 * Normalize version string (remove leading 'v' or 'app-v' if present)
 */
function normalizeVersion(version: string): string {
  if (version.startsWith("app-v")) {
    return version.slice(5); // Remove 'app-v'
  } else if (version.startsWith("v")) {
    return version.slice(1); // Remove 'v'
  }
  return version;
}

/**
 * Map platform name to standardized Tauri target
 */
function mapPlatformTarget(target: string): TauriTarget | null {
  return PLATFORM_MAPPINGS[target] || null;
}

/**
 * Create standardized error response
 */
function createErrorResponse(
  code: UpdaterError["code"],
  message: string,
  details?: unknown,
): NextResponse {
  const error: UpdaterError = { code, message, details };

  console.error(`[Updater] ${code}:`, message, details);

  return NextResponse.json(
    { success: false, error },
    {
      status:
        code === "CONFIG_ERROR"
          ? 500
          : code === "INVALID_PLATFORM"
            ? 400
            : code === "NO_RELEASE_FOUND"
              ? 404
              : 500,
    },
  );
}
