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
      const { data } = await this.octokit.rest.repos.getLatestRelease({
        owner: CONFIG.githubOwner,
        repo: CONFIG.githubRepo,
      });

      Logger.info('Found latest published release', { version: data.tag_name });
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
    return assets.filter((asset) =>
      supportedExtensions.some((ext) => asset.name.endsWith(ext))
    );
  }

  private findSignatureAsset(
    assets: ReleaseAsset[],
    binaryAssetName: string
  ): ReleaseAsset | undefined {
    return assets.find((asset) => asset.name === `${binaryAssetName}.sig`);
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

const CRITICAL_BODY_PATTERNS = [
  /🚨/,
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
function isCriticalUpdate(release: GitHubRelease): boolean {
  // Check tag name for critical patterns
  if (CRITICAL_TAG_PATTERNS.some((pattern) => pattern.test(release.tag_name))) {
    return true;
  }

  // Check release title for critical patterns
  if (
    release.name &&
    CRITICAL_TAG_PATTERNS.some((pattern) => pattern.test(release.name))
  ) {
    return true;
  }

  // Check release body for critical indicators
  if (
    release.body &&
    CRITICAL_BODY_PATTERNS.some((pattern) => pattern.test(release.body))
  ) {
    return true;
  }

  return false;
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

    // Detect if this is a critical update
    const critical = isCriticalUpdate(release);

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
      Logger.error('Request validation failed', { errors: error.errors });
      return ResponseBuilder.buildErrorResponse(
        new InvalidPlatformError('Invalid request parameters', error.errors)
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
