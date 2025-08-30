import { log } from '@acme/observability/log';
import { Octokit } from '@octokit/rest';
import { env } from '~/env';
import type { GitHubRelease, TauriTarget } from '~/types/updater';
import { PLATFORM_FILE_EXTENSIONS } from '~/types/updater';
import type { DownloadsData, PlatformDownloads } from './downloads-utils';

// Configuration - using the public releases repository
const RELEASES_GITHUB_OWNER = 'Lukem121';
const RELEASES_GITHUB_REPO = 'voicegecko-releases';

// Initialize GitHub client
const octokit = new Octokit({
  auth: env.GITHUB_TOKEN,
  userAgent: 'VoiceGecko-Downloads/1.0',
});

/**
 * Handle 404 error by fetching from all releases
 */
async function fetchFromAllReleases(): Promise<GitHubRelease | null> {
  try {
    const { data: releases } = await octokit.rest.repos.listReleases({
      owner: RELEASES_GITHUB_OWNER,
      repo: RELEASES_GITHUB_REPO,
      per_page: 1,
    });

    return releases.length > 0 ? (releases[0] as GitHubRelease) : null;
  } catch (listError) {
    log.error(listError, 'Error fetching releases list:');
    return null;
  }
}

/**
 * Check if error is a 404 status error
 */
function isNotFoundError(error: unknown): error is { status: number } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'status' in error &&
    (error as { status: unknown }).status === 404
  );
}

/**
 * Format error for throwing
 */
function formatApiError(error: unknown): string {
  const errorMessage =
    error && typeof error === 'object' && 'message' in error
      ? String(error.message)
      : 'Unknown error';
  const errorStatus =
    error && typeof error === 'object' && 'status' in error
      ? String(error.status)
      : 'Unknown';

  return `GitHub API error: ${errorStatus} ${errorMessage}`;
}

/**
 * Fetch the latest FULL release from the public releases repository
 * Full releases include the bundled AI model and are intended for first-time installations
 */
async function fetchLatestRelease(): Promise<GitHubRelease | null> {
  try {
    // For website downloads, prefer "full" releases over "update" releases
    const fullRelease = await fetchLatestFullRelease();
    if (fullRelease) {
      log.info('Found latest full release for website downloads', {
        version: fullRelease.tag_name,
      });
      return fullRelease;
    }

    // Fallback to any latest release if no full release is available
    const { data } = await octokit.rest.repos.getLatestRelease({
      owner: RELEASES_GITHUB_OWNER,
      repo: RELEASES_GITHUB_REPO,
    });

    log.info('Found latest published release (fallback for downloads)', {
      version: data.tag_name,
    });
    return data as GitHubRelease;
  } catch (error) {
    if (isNotFoundError(error)) {
      return await fetchFromAllReleases();
    }

    throw new Error(formatApiError(error));
  }
}

/**
 * Fetch the latest full release (with bundled model) for website downloads
 */
async function fetchLatestFullRelease(): Promise<GitHubRelease | null> {
  try {
    // Get all releases and find the latest "full" release
    const { data: releases } = await octokit.rest.repos.listReleases({
      owner: RELEASES_GITHUB_OWNER,
      repo: RELEASES_GITHUB_REPO,
      per_page: 50, // Get more releases to find full releases
    });

    // Filter for full releases (tag contains "-full")
    const fullReleases = releases.filter(
      (release) => release.tag_name.includes('-full') && !release.draft
    );

    if (fullReleases.length > 0) {
      // Sort by published_at date (most recent first)
      fullReleases.sort(
        (a, b) =>
          new Date(b.published_at || b.created_at).getTime() -
          new Date(a.published_at || a.created_at).getTime()
      );
      return fullReleases[0] as GitHubRelease;
    }

    return null;
  } catch (error) {
    log.warn('Failed to fetch full releases for website downloads', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Process release data into the format needed for the downloads page
 */
function processReleaseForDownloads(release: GitHubRelease): DownloadsData {
  const platforms = {
    windows: processAssetsForPlatform(release.assets, 'windows-x86_64'),
    macos: {
      available: false,
      assets: [
        ...processAssetsForPlatform(release.assets, 'darwin-x86_64').assets,
        ...processAssetsForPlatform(release.assets, 'darwin-aarch64').assets,
      ],
    },
    linux: processAssetsForPlatform(release.assets, 'linux-x86_64'),
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
  assets: GitHubRelease['assets'],
  platform: TauriTarget
): PlatformDownloads {
  const supportedExtensions = PLATFORM_FILE_EXTENSIONS[platform];

  // Filter assets by supported extensions first
  const compatibleAssets = assets.filter(
    (asset) =>
      supportedExtensions.some((ext) => asset.name.endsWith(ext)) &&
      !asset.name.endsWith('.sig') // Exclude signature files from download list
  );

  // For website downloads, prefer "full" assets over "update" assets
  const fullAssets = compatibleAssets.filter((asset) =>
    asset.name.includes('-full')
  );

  const updateAssets = compatibleAssets.filter((asset) =>
    asset.name.includes('-update')
  );

  const otherAssets = compatibleAssets.filter(
    (asset) => !(asset.name.includes('-full') || asset.name.includes('-update'))
  );

  log.info('Asset filtering for website downloads', {
    platform,
    total: compatibleAssets.length,
    fullAssets: fullAssets.length,
    updateAssets: updateAssets.length,
    otherAssets: otherAssets.length,
  });

  // Prioritize full assets, then fall back to other assets, then update assets as last resort
  let selectedAssets: GitHubRelease['assets'] = [];

  if (fullAssets.length > 0) {
    log.info('Using full assets for website downloads with bundled model');
    selectedAssets = fullAssets;
  } else if (otherAssets.length > 0) {
    log.warn('No full assets found, using other compatible assets');
    selectedAssets = otherAssets;
  } else if (updateAssets.length > 0) {
    log.warn('Only update assets available, using lightweight downloads');
    selectedAssets = updateAssets;
  } else {
    log.warn('No categorized assets found, returning all compatible assets');
    selectedAssets = compatibleAssets;
  }

  const platformAssets = selectedAssets.map((asset) => ({
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
  if (version.startsWith('app-v')) {
    return version.slice(5);
  }
  if (version.startsWith('v')) {
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
    throw new Error('Missing required environment variable: GITHUB_TOKEN');
  }

  // Fetch the latest release from the public releases repository
  const release = await fetchLatestRelease();

  if (!release) {
    throw new Error('No releases found in the releases repository');
  }

  // Process the release data for the downloads page
  return processReleaseForDownloads(release);
}
