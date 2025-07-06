import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
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

// ===== CONFIGURATION =====

interface Config {
  readonly githubToken: string;
  readonly githubOwner: string;
  readonly githubRepo: string;
}

const CONFIG: Config = {
  githubToken: env.GITHUB_TOKEN,
  githubOwner: env.GITHUB_OWNER,
  githubRepo: env.GITHUB_REPO,
} as const;

const PLATFORM_MAPPINGS: Record<string, TauriTarget> = {
  windows: "windows-x86_64",
  linux: "linux-x86_64",
  darwin: "darwin-x86_64",
  macos: "darwin-x86_64",
  "windows-x86_64": "windows-x86_64",
  "linux-x86_64": "linux-x86_64",
  "darwin-x86_64": "darwin-x86_64",
  "darwin-aarch64": "darwin-aarch64",
} as const;

// ===== VALIDATION SCHEMAS =====

const requestParamsSchema = z.object({
  target: z.string().min(1),
  version: z.string().min(1),
});

// ===== CUSTOM ERRORS =====

abstract class UpdaterServiceError extends Error {
  abstract readonly code: UpdaterError["code"];
  abstract readonly httpStatus: number;

  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

class ConfigurationError extends UpdaterServiceError {
  readonly code = "CONFIG_ERROR" as const;
  readonly httpStatus = 500;
}

class InvalidPlatformError extends UpdaterServiceError {
  readonly code = "INVALID_PLATFORM" as const;
  readonly httpStatus = 400;
}

class NoReleaseFoundError extends UpdaterServiceError {
  readonly code = "NO_RELEASE_FOUND" as const;
  readonly httpStatus = 404;
}

class GitHubApiError extends UpdaterServiceError {
  readonly code = "GITHUB_API_ERROR" as const;
  readonly httpStatus = 500;
}

// ===== SERVICES =====

class GitHubService {
  private readonly octokit: Octokit;

  constructor(config: Config) {
    this.octokit = new Octokit({
      auth: config.githubToken,
      userAgent: "VoiceGecko-Updater/1.0",
    });
  }

  async getLatestRelease(): Promise<GitHubRelease | null> {
    try {
      const { data } = await this.octokit.rest.repos.getLatestRelease({
        owner: CONFIG.githubOwner,
        repo: CONFIG.githubRepo,
      });

      Logger.info("Found latest published release", { version: data.tag_name });
      return data as GitHubRelease;
    } catch (error) {
      if (error instanceof Error && "status" in error && error.status === 404) {
        Logger.info("No published releases found, checking drafts");
        return this.getLatestReleaseIncludingDrafts();
      }
      if (error instanceof Error) {
        throw new GitHubApiError(
          `Failed to fetch latest release: ${error.message}`,
          error,
        );
      }
      throw new GitHubApiError("Failed to fetch latest release", error);
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
          error,
        );
      }
      throw new GitHubApiError("Failed to fetch releases", error);
    }
  }

  async fetchSignatureContent(assetId: number): Promise<string> {
    try {
      const { data } = await this.octokit.rest.repos.getReleaseAsset({
        owner: CONFIG.githubOwner,
        repo: CONFIG.githubRepo,
        asset_id: assetId,
        headers: {
          Accept: "application/octet-stream",
        },
      });

      return this.convertDataToString(data);
    } catch (error) {
      if (error instanceof Error) {
        throw new GitHubApiError(
          `Failed to fetch signature: ${error.message}`,
          error,
        );
      }
      throw new GitHubApiError("Failed to fetch signature", error);
    }
  }

  private convertDataToString(data: unknown): string {
    if (typeof data === "string") {
      return data;
    }
    if (data instanceof ArrayBuffer) {
      return Buffer.from(data).toString("utf-8");
    }
    return String(data);
  }
}

interface ReleaseAsset {
  readonly id: number;
  readonly name: string;
  readonly browser_download_url: string;
}

class AssetProcessor {
  constructor(private readonly githubService: GitHubService) {}

  async processReleaseAssets(
    release: GitHubRelease,
    targetPlatform: TauriTarget,
  ): Promise<ProcessedAsset[]> {
    const supportedExtensions = PLATFORM_FILE_EXTENSIONS[targetPlatform];
    const binaryAssets = this.findBinaryAssets(
      release.assets,
      supportedExtensions,
    );

    Logger.debug("Processing release assets", {
      platform: targetPlatform,
      totalAssets: release.assets.length,
      binaryAssets: binaryAssets.length,
      supportedExtensions,
    });

    if (binaryAssets.length === 0) {
      return [];
    }

    const processedAssets: ProcessedAsset[] = [];

    for (const binaryAsset of binaryAssets) {
      const signatureAsset = this.findSignatureAsset(
        release.assets,
        binaryAsset.name,
      );

      if (!signatureAsset) {
        continue; // Skip assets without signatures
      }

      try {
        const signature = await this.githubService.fetchSignatureContent(
          signatureAsset.id,
        );

        processedAssets.push({
          platform: targetPlatform,
          url: binaryAsset.browser_download_url,
          signature,
        });
      } catch (error) {
        Logger.warn("Failed to fetch signature, using fallback", {
          asset: binaryAsset.name,
          error: error instanceof Error ? error.message : String(error),
        });

        // Add asset without signature as fallback
        processedAssets.push({
          platform: targetPlatform,
          url: binaryAsset.browser_download_url,
          signature: "",
        });
      }
    }

    return processedAssets;
  }

  private findBinaryAssets(
    assets: ReleaseAsset[],
    supportedExtensions: string[],
  ): ReleaseAsset[] {
    return assets.filter((asset) =>
      supportedExtensions.some((ext) => asset.name.endsWith(ext)),
    );
  }

  private findSignatureAsset(
    assets: ReleaseAsset[],
    binaryAssetName: string,
  ): ReleaseAsset | undefined {
    return assets.find((asset) => asset.name === `${binaryAssetName}.sig`);
  }
}

class UpdaterService {
  constructor(
    private readonly githubService: GitHubService,
    private readonly assetProcessor: AssetProcessor,
  ) {}

  async checkForUpdate(
    targetPlatform: TauriTarget,
    currentVersion: string,
  ): Promise<TauriUpdaterResponse | null> {
    const release = await this.githubService.getLatestRelease();

    if (!release) {
      throw new NoReleaseFoundError("No releases found in repository");
    }

    const normalizedReleaseVersion = VersionUtils.normalize(release.tag_name);
    const normalizedCurrentVersion = VersionUtils.normalize(currentVersion);

    // No update needed if versions match
    if (normalizedReleaseVersion === normalizedCurrentVersion) {
      return null;
    }

    const processedAssets = await this.assetProcessor.processReleaseAssets(
      release,
      targetPlatform,
    );

    if (processedAssets.length === 0) {
      throw new NoReleaseFoundError(
        `No compatible assets found for platform: ${targetPlatform}`,
      );
    }

    return ResponseBuilder.buildTauriResponse(release, processedAssets);
  }
}

// ===== UTILITIES =====

class VersionUtils {
  static normalize(version: string): string {
    if (version.startsWith("app-v")) {
      return version.slice(5);
    }
    if (version.startsWith("v")) {
      return version.slice(1);
    }
    return version;
  }
}

class PlatformUtils {
  static mapToTauriTarget(platform: string): TauriTarget | null {
    return PLATFORM_MAPPINGS[platform] ?? null;
  }

  static getSupportedPlatforms(): string[] {
    return Object.keys(PLATFORM_MAPPINGS);
  }
}

class ResponseBuilder {
  static buildTauriResponse(
    release: GitHubRelease,
    assets: ProcessedAsset[],
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

    return {
      version: VersionUtils.normalize(release.tag_name),
      notes: release.body || undefined,
      pub_date: release.published_at,
      platforms,
    };
  }

  static buildErrorResponse(error: UpdaterServiceError): NextResponse {
    const errorPayload: UpdaterError = {
      code: error.code,
      message: error.message,
      details: error.details,
    };

    return NextResponse.json(
      { success: false, error: errorPayload },
      { status: error.httpStatus },
    );
  }
}

class ConfigurationValidator {
  static validate(): void {
    if (!CONFIG.githubToken || !CONFIG.githubOwner || !CONFIG.githubRepo) {
      throw new ConfigurationError(
        "Missing required environment variables: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO",
      );
    }
  }
}

// ===== LOGGING =====

type LogContext = Readonly<Record<string, unknown>>;

class Logger {
  private static formatMessage(
    level: string,
    message: string,
    context?: LogContext,
  ): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [Updater] [${level}]`;
    return context
      ? `${prefix} ${message} ${JSON.stringify(context)}`
      : `${prefix} ${message}`;
  }

  static info(message: string, context?: LogContext): void {
    console.log(this.formatMessage("INFO", message, context));
  }

  static error(message: string, context?: LogContext): void {
    console.error(this.formatMessage("ERROR", message, context));
  }

  static warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage("WARN", message, context));
  }

  static debug(message: string, context?: LogContext): void {
    if (env.NODE_ENV === "development") {
      console.debug(this.formatMessage("DEBUG", message, context));
    }
  }
}

// ===== REQUEST HANDLER =====

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ target: string; version: string }> },
): Promise<NextResponse> {
  try {
    // Validate configuration
    ConfigurationValidator.validate();

    // Parse and validate request parameters
    const resolvedParams = await params;
    const validatedParams = requestParamsSchema.parse(resolvedParams);

    Logger.info("Processing update request", {
      target: validatedParams.target,
      currentVersion: validatedParams.version,
    });

    // Map platform to Tauri target
    const targetPlatform = PlatformUtils.mapToTauriTarget(
      validatedParams.target,
    );
    if (!targetPlatform) {
      throw new InvalidPlatformError(
        `Unsupported platform: ${validatedParams.target}. Supported platforms: ${PlatformUtils.getSupportedPlatforms().join(", ")}`,
      );
    }

    // Initialize services
    const githubService = new GitHubService(CONFIG);
    const assetProcessor = new AssetProcessor(githubService);
    const updaterService = new UpdaterService(githubService, assetProcessor);

    // Check for updates
    const updateResponse = await updaterService.checkForUpdate(
      targetPlatform,
      validatedParams.version,
    );

    // Return 204 if no update is available
    if (!updateResponse) {
      Logger.info("No update available - client is up to date");
      return new NextResponse(null, { status: 204 });
    }

    Logger.info("Update available", {
      newVersion: updateResponse.version,
      platforms: Object.keys(updateResponse.platforms),
    });

    return NextResponse.json(updateResponse);
  } catch (error) {
    if (error instanceof UpdaterServiceError) {
      Logger.error("Updater service error", {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return ResponseBuilder.buildErrorResponse(error);
    }

    if (error instanceof z.ZodError) {
      Logger.error("Request validation failed", { errors: error.errors });
      return ResponseBuilder.buildErrorResponse(
        new InvalidPlatformError("Invalid request parameters", error.errors),
      );
    }

    // Handle unexpected errors
    Logger.error("Unexpected error in updater", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    const unknownError = new GitHubApiError(
      error instanceof Error ? error.message : "Unknown error occurred",
      error,
    );

    return ResponseBuilder.buildErrorResponse(unknownError);
  }
}
