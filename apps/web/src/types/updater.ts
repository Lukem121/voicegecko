// GitHub API Types
export type GitHubRelease = {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  prerelease: boolean;
  draft: boolean;
  assets: GitHubAsset[];
};

export type GitHubAsset = {
  id: number;
  name: string;
  browser_download_url: string;
  size: number;
  content_type: string;
  created_at: string;
};

// Tauri Updater Types (based on https://tauri.app/plugin/updater/#static-json-file)
export type TauriUpdaterResponse = {
  version: string;
  notes?: string;
  pub_date?: string;
  platforms: Record<string, TauriPlatformData>;
  critical?: boolean;
};

export type TauriPlatformData = {
  signature: string;
  url: string;
};

// Supported platform mappings
export type TauriTarget =
  | 'linux-x86_64'
  | 'windows-x86_64'
  | 'darwin-x86_64'
  | 'darwin-aarch64';

// Internal types for processing
export type ProcessedAsset = {
  platform: TauriTarget;
  url: string;
  signature?: string;
};

export type UpdaterConfig = {
  owner: string;
  repo: string;
  githubToken: string;
};

// Error types
export type UpdaterError = {
  code:
    | 'GITHUB_API_ERROR'
    | 'NO_RELEASE_FOUND'
    | 'INVALID_PLATFORM'
    | 'MISSING_SIGNATURE'
    | 'CONFIG_ERROR';
  message: string;
  details?: unknown;
};

// File extension mappings for different platforms
export const PLATFORM_FILE_EXTENSIONS: Record<TauriTarget, string[]> = {
  'linux-x86_64': ['.AppImage'],
  'windows-x86_64': ['.msi', '.exe'],
  'darwin-x86_64': ['.app.tar.gz', '.dmg'],
  'darwin-aarch64': ['.app.tar.gz', '.dmg'],
} as const;

// Helper type for API responses
export type UpdaterApiResponse<T = TauriUpdaterResponse> = {
  success: boolean;
  data?: T;
  error?: UpdaterError;
};
