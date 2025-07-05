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
const CACHE_TTL = env.UPDATER_CACHE_TTL;

// Response caching
const cache = new Map<
  string,
  { data: TauriUpdaterResponse; timestamp: number }
>();

// Validation schemas
const paramsSchema = z.object({
  target: z.string().min(1),
  version: z.string().min(1),
});

/**
 * GET /api/updater/[target]/[version]
 *
 * Serves update information for Tauri applications by fetching from GitHub releases
 * and transforming to the expected Tauri updater JSON format.
 *
 * @param target - Platform target (e.g., "windows-x86_64", "linux-x86_64", "darwin-x86_64")
 * @param version - Current version of the application
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { target: string; version: string } },
) {
  try {
    // Validate environment configuration
    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
      return createErrorResponse(
        "CONFIG_ERROR",
        "Missing required environment variables: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO",
      );
    }

    // Validate request parameters
    const result = paramsSchema.safeParse(params);
    if (!result.success) {
      return createErrorResponse(
        "INVALID_PLATFORM",
        "Invalid request parameters",
      );
    }

    const { target, version: currentVersion } = result.data;

    // Validate target platform
    if (!isValidTauriTarget(target)) {
      return createErrorResponse(
        "INVALID_PLATFORM",
        `Unsupported platform: ${target}. Supported platforms: ${Object.keys(PLATFORM_FILE_EXTENSIONS).join(", ")}`,
      );
    }

    // Check cache first
    const cacheKey = `${target}-${currentVersion}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL * 1000) {
      console.log(`[Updater] Cache hit for ${cacheKey}`);
      return NextResponse.json(cachedData.data);
    }

    // Fetch latest release from GitHub
    console.log(
      `[Updater] Fetching latest release for ${GITHUB_OWNER}/${GITHUB_REPO}`,
    );
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
      console.log(
        `[Updater] Client is already on latest version: ${currentVersion}`,
      );
      return new NextResponse(null, { status: 204 }); // No content - no update available
    }

    // Process assets for the requested platform
    const processedAssets = await processReleaseAssets(release, target);

    if (processedAssets.length === 0) {
      return createErrorResponse(
        "NO_RELEASE_FOUND",
        `No compatible assets found for platform: ${target}`,
      );
    }

    // Build Tauri updater response
    const updaterResponse = buildTauriResponse(release, processedAssets);

    // Cache the response
    cache.set(cacheKey, {
      data: updaterResponse,
      timestamp: Date.now(),
    });

    console.log(`[Updater] Serving update ${release.tag_name} for ${target}`);
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
 */
async function fetchLatestRelease(): Promise<GitHubRelease | null> {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "VoiceGecko-Updater/1.0",
    },
    next: { revalidate: CACHE_TTL }, // Next.js cache revalidation
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(
      `GitHub API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<GitHubRelease>;
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
      console.warn(`[Updater] No signature found for ${binaryAsset.name}`);
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
    } catch (error) {
      console.error(
        `[Updater] Failed to fetch signature for ${binaryAsset.name}:`,
        error,
      );
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
      console.warn(`[Updater] No signature found for ${asset.url}`);
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
 * Normalize version string (remove leading 'v' if present)
 */
function normalizeVersion(version: string): string {
  return version.startsWith("v") ? version.slice(1) : version;
}

/**
 * Check if target is a valid Tauri target
 */
function isValidTauriTarget(target: string): target is TauriTarget {
  return Object.keys(PLATFORM_FILE_EXTENSIONS).includes(target);
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
