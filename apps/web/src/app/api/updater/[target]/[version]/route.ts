import { log } from '@acme/observability/log';
import { Octokit } from '@octokit/rest';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '~/env';
import type {
  GitHubRelease,
  ProcessedAsset,
  TauriTarget,
  TauriUpdaterResponse,
  UpdaterError,
} from '~/types/updater';

import { PLATFORM_FILE_EXTENSIONS } from '~/types/updater';

// ===== CONFIGURATION =====

type Config = {
  readonly githubToken: string;
  readonly githubOwner: string;
  readonly githubRepo: string;
};

const CONFIG: Config = {
  githubToken: env.GITHUB_TOKEN,
  githubOwner: env.GITHUB_OWNER,
  githubRepo: env.GITHUB_REPO,
} as const;

const PLATFORM_MAPPINGS: Record<string, TauriTarget> = {
  windows: 'windows-x86_64',
  linux: 'linux-x86_64',
  darwin: 'darwin-x86_64',
  macos: 'darwin-x86_64',
  'windows-x86_64': 'windows-x86_64',
  'linux-x86_64': 'linux-x86_64',
  'darwin-x86_64': 'darwin-x86_64',
  'darwin-aarch64': 'darwin-aarch64',
} as const;

// ===== VALIDATION SCHEMAS =====

const requestParamsSchema = z.object({
  target: z.string().min(1),
  version: z.string().min(1),
});

// ===== CUSTOM ERRORS =====

abstract class UpdaterServiceError extends Error {
  abstract readonly code: UpdaterError['code'];
  abstract readonly httpStatus: number;
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }
}

class ConfigurationError extends UpdaterServiceError {
  readonly code = 'CONFIG_ERROR' as const;
  readonly httpStatus = 500;
}

class InvalidPlatformError extends UpdaterServiceError {
  readonly code = 'INVALID_PLATFORM' as const;
  readonly httpStatus = 400;
}

class NoReleaseFoundError extends UpdaterServiceError {
  readonly code = 'NO_RELEASE_FOUND' as const;
  readonly httpStatus = 404;
}

class GitHubApiError extends UpdaterServiceError {
  readonly code = 'GITHUB_API_ERROR' as const;
  readonly httpStatus = 500;
}

// ===== SERVICES =====

class GitHubService {
  private readonly octokit: Octokit;

  constructor(config: Config) {
    this.octokit = new Octokit({
      auth: config.githubToken,
      userAgent: 'VoiceGecko-Updater/1.0',
    });
  }

  async getLatestRelease(): Promise<GitHubRelease | null> {
    try {
      // For updater requests, prefer "update" releases over "full" releases
      const updateRelease = await this.getLatestUpdateRelease();
      if (updateRelease) {
        Logger.info('Found latest update release for updater', {
          version: updateRelease.tag_name,
        });
        return updateRelease;
      }

      // Fallback to any latest release if no update release is available
      const { data } = await this.octokit.rest.repos.getLatestRelease({
        owner: CONFIG.githubOwner,
        repo: CONFIG.githubRepo,
      });

      Logger.info('Found latest published release (fallback)', {
        version: data.tag_name,
      });
      return data as GitHubRelease;
    } catch (error) {
      if (error instanceof Error && 'status' in error && error.status === 404) {
        Logger.info('No published releases found, checking drafts');
        return this.getLatestReleaseIncludingDrafts();
      }
      if (error instanceof Error) {
        throw new GitHubApiError(
          `Failed to fetch latest release: ${error.message}`,
          error
        );
      }
      throw new GitHubApiError('Failed to fetch latest release', error);
    }
  }

  private async getLatestUpdateRelease(): Promise<GitHubRelease | null> {
    try {
      // Get all releases and find the latest "update" release
      const { data: releases } = await this.octokit.rest.repos.listReleases({
        owner: CONFIG.githubOwner,
        repo: CONFIG.githubRepo,
        per_page: 50, // Get more releases to find update releases
      });

      // Filter for update releases (tag contains "-update")
      const updateReleases = releases.filter(
        (release) => release.tag_name.includes('-update') && !release.draft
      );

      if (updateReleases.length > 0) {
        // Sort by published_at date (most recent first)
        updateReleases.sort(
          (a, b) =>
            new Date(b.published_at || b.created_at).getTime() -
            new Date(a.published_at || a.created_at).getTime()
        );
        return updateReleases[0] as GitHubRelease;
      }

      return null;
    } catch (error) {
      Logger.warn('Failed to fetch update releases', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async getLatestReleaseIncludingDrafts(): Promise<GitHubRelease | null> {
    try {
      const { data: releases } = await this.octokit.rest.repos.listReleases({
        owner: CONFIG.githubOwner,
        repo: CONFIG.githubRepo,
        per_page: 1,
      });

      return releases.length > 0 ? (releases[0] as GitHubRelease) : null;
    } catch (error) {
      if (error instanceof Error) {
        throw new GitHubApiError(
          `Failed to fetch releases: ${error.message}`,
          error
        );
      }
      throw new GitHubApiError('Failed to fetch releases', error);
    }
  }

  async fetchSignatureContent(assetId: number): Promise<string> {
    try {
      const { data } = await this.octokit.rest.repos.getReleaseAsset({
        owner: CONFIG.githubOwner,
        repo: CONFIG.githubRepo,
        asset_id: assetId,
        headers: {
          Accept: 'application/octet-stream',
        },
      });

      return this.convertDataToString(data);
    } catch (error) {
      if (error instanceof Error) {
        throw new GitHubApiError(
          `Failed to fetch signature: ${error.message}`,
          error
        );
      }
      throw new GitHubApiError('Failed to fetch signature', error);
    }
  }

  private convertDataToString(data: unknown): string {
    if (typeof data === 'string') {
      return data;
    }
    if (data instanceof ArrayBuffer) {
      return Buffer.from(data).toString('utf-8');
    }
    return String(data);
  }
}

type ReleaseAsset = {
  readonly id: number;
  readonly name: string;
  readonly browser_download_url: string;
};

class AssetProcessor {
  private readonly githubService: GitHubService;

  constructor(githubService: GitHubService) {
    this.githubService = githubService;
  }

  async processReleaseAssets(
    release: GitHubRelease,
    targetPlatform: TauriTarget
  ): Promise<ProcessedAsset[]> {
    const supportedExtensions = PLATFORM_FILE_EXTENSIONS[targetPlatform];
    const binaryAssets = this.findBinaryAssets(
      release.assets,
      supportedExtensions
    );

    Logger.debug('Processing release assets', {
      platform: targetPlatform,
      totalAssets: release.assets.length,
      binaryAssets: binaryAssets.length,
      supportedExtensions,
    });

    if (binaryAssets.length === 0) {
      return [];
    }

    // Create tasks for assets with signatures
    const signatureTasks = binaryAssets
      .map((binaryAsset) => {
        const signatureAsset = this.findSignatureAsset(
          release.assets,
          binaryAsset.name
        );
        return signatureAsset ? { binaryAsset, signatureAsset } : null;
      })
      .filter((task): task is NonNullable<typeof task> => task !== null);

    // Fetch all signatures in parallel
    const signatureResults = await Promise.allSettled(
      signatureTasks.map(async ({ binaryAsset, signatureAsset }) => {
        const signature = await this.githubService.fetchSignatureContent(
          signatureAsset.id
        );
        return { binaryAsset, signature };
      })
    );

    // Process results
    const processedAssets: ProcessedAsset[] = [];

    for (let i = 0; i < signatureResults.length; i++) {
      const result = signatureResults[i];
      const data = signatureTasks[i];

      if (!(result && data)) {
        continue;
      }

      const { binaryAsset } = data;

      if (result.status === 'fulfilled') {
        processedAssets.push({
          platform: targetPlatform,
          url: binaryAsset.browser_download_url,
          signature: result.value.signature,
        });
      } else {
        Logger.warn('Failed to fetch signature, using fallback', {
          asset: binaryAsset.name,
          error:
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason),
        });

        // Add asset without signature as fallback
        processedAssets.push({
          platform: targetPlatform,
          url: binaryAsset.browser_download_url,
          signature: '',
        });
      }
    }

    return processedAssets;
  }

  private findBinaryAssets(
    assets: ReleaseAsset[],
    supportedExtensions: string[]
  ): ReleaseAsset[] {
    // Filter assets by supported extensions first
    const compatibleAssets = assets.filter((asset) =>
      supportedExtensions.some((ext) => asset.name.endsWith(ext))
    );

    // For updater requests, prefer "update" assets over "full" assets
    const updateAssets = compatibleAssets.filter(
      (asset) => asset.name.includes('-update') && !asset.name.endsWith('.sig')
    );

    const fullAssets = compatibleAssets.filter(
      (asset) => asset.name.includes('-full') && !asset.name.endsWith('.sig')
    );

    const otherAssets = compatibleAssets.filter((asset) => {
      const hasSpecialSuffix =
        asset.name.includes('-update') || asset.name.includes('-full');
      const isSignature = asset.name.endsWith('.sig');
      return !(hasSpecialSuffix || isSignature);
    });

    Logger.info('Asset filtering for updater', {
      total: compatibleAssets.length,
      updateAssets: updateAssets.length,
      fullAssets: fullAssets.length,
      otherAssets: otherAssets.length,
    });

    // Prioritize update assets, then fall back to full assets, then other assets
    if (updateAssets.length > 0) {
      Logger.info('Using update assets for lightweight download');
      return updateAssets;
    }

    if (fullAssets.length > 0) {
      Logger.warn('No update assets found, falling back to full assets');
      return fullAssets;
    }

    if (otherAssets.length > 0) {
      Logger.warn(
        'No update or full assets found, using other compatible assets'
      );
      return otherAssets;
    }

    // If no categorized assets found, return all compatible assets as fallback
    Logger.warn('No categorized assets found, returning all compatible assets');
    return compatibleAssets.filter((asset) => !asset.name.endsWith('.sig'));
  }

  private findSignatureAsset(
    assets: ReleaseAsset[],
    binaryAssetName: string
  ): ReleaseAsset | undefined {
    // First try exact match for the signature
    const exactMatch = assets.find(
      (asset) => asset.name === `${binaryAssetName}.sig`
    );
    if (exactMatch) {
      return exactMatch;
    }

    // For update/full assets, try to find corresponding signature
    // e.g., "app-v1.0.0-update-windows-x86_64.msi" -> "app-v1.0.0-update-windows-x86_64.msi.sig"
    const directSigMatch = assets.find(
      (asset) => asset.name === `${binaryAssetName}.sig`
    );
    if (directSigMatch) {
      return directSigMatch;
    }

    // Fallback: try to find any signature that matches the base pattern
    // This handles cases where signature naming might be slightly different
    const baseName = binaryAssetName.replace(FILE_EXTENSION_REGEX, ''); // Remove extension
    const potentialSigMatch = assets.find(
      (asset) => asset.name.endsWith('.sig') && asset.name.includes(baseName)
    );

    return potentialSigMatch;
  }
}

class UpdaterService {
  private readonly githubService: GitHubService;
  private readonly assetProcessor: AssetProcessor;

  constructor(githubService: GitHubService, assetProcessor: AssetProcessor) {
    this.githubService = githubService;
    this.assetProcessor = assetProcessor;
  }

  async checkForUpdate(
    targetPlatform: TauriTarget,
    currentVersion: string
  ): Promise<TauriUpdaterResponse | null> {
    const release = await this.githubService.getLatestRelease();

    if (!release) {
      throw new NoReleaseFoundError('No releases found in repository');
    }

    const normalizedReleaseVersion = normalizeVersion(release.tag_name);
    const normalizedCurrentVersion = normalizeVersion(currentVersion);

    // No update needed if versions match
    if (normalizedReleaseVersion === normalizedCurrentVersion) {
      return null;
    }

    const processedAssets = await this.assetProcessor.processReleaseAssets(
      release,
      targetPlatform
    );

    if (processedAssets.length === 0) {
      throw new NoReleaseFoundError(
        `No compatible assets found for platform: ${targetPlatform}`
      );
    }

    return ResponseBuilder.buildTauriResponse(release, processedAssets);
  }
}

// ===== UTILITIES =====

// Define regex patterns at top level for performance
const CRITICAL_TAG_PATTERNS = [
  /critical/i,
  /security/i,
  /urgent/i,
  /hotfix/i,
  /emergency/i,
] as const;

// Regex for extracting base names from asset file names
const FILE_EXTENSION_REGEX = /\.[^.]+$/;
const NEWLINE_REGEX = /\r?\n/;
const VALID_CHANNELS = new Set(['stable', 'beta', 'canary']);

const CRITICAL_BODY_PATTERNS = [
  /critical.*update/i,
  /security.*fix/i,
  /urgent.*update/i,
  /mandatory.*update/i,
  /forced.*update/i,
  /breaking.*change/i,
] as const;

/**
 * Detects if a GitHub release should be treated as a critical/forced update
 * based on release tags, title, or body content
 */
function parseReleaseMetadata(release: GitHubRelease): {
  critical: boolean;
  channel: 'stable' | 'beta' | 'canary';
  minSupportedDesktop?: string;
  rolloutPercent?: number;
} {
  // Default values
  let critical = false;
  let channel: 'stable' | 'beta' | 'canary' = release.prerelease
    ? 'beta'
    : 'stable';
  let minSupportedDesktop: string | undefined;
  let rolloutPercent: number | undefined;

  // Parse simple YAML/JSON front-matter-like blocks from body if present
  if (release.body) {
    try {
      const lines = release.body.split(NEWLINE_REGEX);
      for (const rawLine of lines) {
        const line = rawLine.trim();
        const [k, ...rest] = line.split(':');
        const key = k?.toLowerCase();
        const value = rest.join(':').trim();
        if (!key) {
          continue;
        }
        if (!value) {
          continue;
        }
        if (key === 'critical') {
          critical = value === 'true' || value === 'yes';
        }
        if (key === 'channel' && VALID_CHANNELS.has(value)) {
          channel = value as 'stable' | 'beta' | 'canary';
        }
        if (key === 'min_supported_desktop') {
          minSupportedDesktop = value;
        }
        if (key === 'rollout_percent') {
          const n = Number.parseInt(value, 10);
          if (!Number.isNaN(n) && n >= 0 && n <= 100) {
            rolloutPercent = n;
          }
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  // Fallback heuristics for critical when metadata not explicit
  // Check tag name for critical patterns
  if (
    !critical &&
    CRITICAL_TAG_PATTERNS.some((p) => p.test(release.tag_name))
  ) {
    critical = true;
  }

  // Check release title for critical patterns
  if (
    release.name &&
    !critical &&
    CRITICAL_TAG_PATTERNS.some((p) => p.test(release.name))
  ) {
    critical = true;
  }

  // Check release body for critical indicators
  if (
    release.body &&
    !critical &&
    CRITICAL_BODY_PATTERNS.some((p) => p.test(release.body))
  ) {
    critical = true;
  }

  return { critical, channel, minSupportedDesktop, rolloutPercent };
}

function normalizeVersion(version: string): string {
  if (version.startsWith('app-v')) {
    return version.slice(5);
  }
  if (version.startsWith('v')) {
    return version.slice(1);
  }
  return version;
}

const PlatformUtils = {
  mapToTauriTarget(platform: string): TauriTarget | null {
    return PLATFORM_MAPPINGS[platform] ?? null;
  },

  getSupportedPlatforms(): string[] {
    return Object.keys(PLATFORM_MAPPINGS);
  },
} as const;

const ResponseBuilder = {
  buildTauriResponse(
    release: GitHubRelease,
    assets: ProcessedAsset[]
  ): TauriUpdaterResponse {
    const platforms: Record<string, { signature: string; url: string }> = {};

    for (const asset of assets) {
      if (asset.signature) {
        platforms[asset.platform] = {
          signature: asset.signature,
          url: asset.url,
        };
      }
    }

    const meta = parseReleaseMetadata(release);
    const critical = meta.critical;

    if (critical) {
      Logger.info('Critical update detected', {
        version: release.tag_name,
        reason: 'Release contains critical update indicators',
      });
    }

    return {
      version: normalizeVersion(release.tag_name),
      notes: release.body || undefined,
      pub_date: release.published_at,
      platforms,
      critical,
    };
  },

  buildErrorResponse(error: UpdaterServiceError): NextResponse {
    const errorPayload: UpdaterError = {
      code: error.code,
      message: error.message,
      details: error.details,
    };

    return NextResponse.json(
      { success: false, error: errorPayload },
      { status: error.httpStatus }
    );
  },
} as const;

function validateConfiguration(): void {
  if (!(CONFIG.githubToken && CONFIG.githubOwner && CONFIG.githubRepo)) {
    throw new ConfigurationError(
      'Missing required environment variables: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO'
    );
  }
}

// ===== LOGGING =====

type LogContext = Readonly<Record<string, unknown>>;

function formatLogMessage(
  level: string,
  message: string,
  context?: LogContext
): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [Updater] [${level}]`;
  return context
    ? `${prefix} ${message} ${JSON.stringify(context)}`
    : `${prefix} ${message}`;
}

const Logger = {
  info(message: string, context?: LogContext): void {
    log.info(formatLogMessage('INFO', message, context));
  },

  error(message: string, context?: LogContext): void {
    log.error(formatLogMessage('ERROR', message, context));
  },

  warn(message: string, context?: LogContext): void {
    log.warn(formatLogMessage('WARN', message, context));
  },

  debug(message: string, context?: LogContext): void {
    if (env.NODE_ENV === 'development') {
      log.debug(formatLogMessage('DEBUG', message, context));
    }
  },
} as const;

// ===== REQUEST HANDLER =====

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ target: string; version: string }> }
): Promise<NextResponse> {
  try {
    // Validate configuration
    validateConfiguration();

    // Parse and validate request parameters
    const resolvedParams = await params;
    const validatedParams = requestParamsSchema.parse(resolvedParams);

    Logger.info('Processing update request', {
      target: validatedParams.target,
      currentVersion: validatedParams.version,
    });

    // Map platform to Tauri target
    const targetPlatform = PlatformUtils.mapToTauriTarget(
      validatedParams.target
    );
    if (!targetPlatform) {
      throw new InvalidPlatformError(
        `Unsupported platform: ${validatedParams.target}. Supported platforms: ${PlatformUtils.getSupportedPlatforms().join(', ')}`
      );
    }

    // Initialize services
    const githubService = new GitHubService(CONFIG);
    const assetProcessor = new AssetProcessor(githubService);
    const updaterService = new UpdaterService(githubService, assetProcessor);

    // Check for updates
    const updateResponse = await updaterService.checkForUpdate(
      targetPlatform,
      validatedParams.version
    );

    // Return 204 if no update is available
    if (!updateResponse) {
      Logger.info('No update available - client is up to date');
      return new NextResponse(null, { status: 204 });
    }

    Logger.info('Update available', {
      newVersion: updateResponse.version,
      platforms: Object.keys(updateResponse.platforms),
    });

    // MVP: No staged rollout; always return updateResponse

    return NextResponse.json(updateResponse);
  } catch (error) {
    if (error instanceof UpdaterServiceError) {
      Logger.error('Updater service error', {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return ResponseBuilder.buildErrorResponse(error);
    }

    if (error instanceof z.ZodError) {
      Logger.error('Request validation failed', { errors: error });
      return ResponseBuilder.buildErrorResponse(
        new InvalidPlatformError('Invalid request parameters', error)
      );
    }

    // Handle unexpected errors
    Logger.error('Unexpected error in updater', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    const unknownError = new GitHubApiError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      error
    );

    return ResponseBuilder.buildErrorResponse(unknownError);
  }
}
