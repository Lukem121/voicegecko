export type DownloadAsset = {
  name: string;
  url: string;
  size: number;
  contentType: string;
};

export type PlatformDownloads = {
  available: boolean;
  assets: DownloadAsset[];
};

export type DownloadsData = {
  version: string;
  publishedAt: string;
  releaseNotes?: string;
  platforms: {
    windows: PlatformDownloads;
    macos: PlatformDownloads;
    linux: PlatformDownloads;
  };
};

/**
 * Helper function to format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function assetsMatchingVersion(
  assets: DownloadAsset[],
  version?: string
): DownloadAsset[] {
  if (!version) {
    return assets;
  }

  const matching = assets.filter((asset) => asset.name.includes(version));
  return matching.length > 0 ? matching : assets;
}

/**
 * Helper function to get the primary download for a platform
 */
export function getPrimaryDownload(
  platformDownloads: PlatformDownloads,
  version?: string
): DownloadAsset | null {
  if (!platformDownloads.available || platformDownloads.assets.length === 0) {
    return null;
  }

  const assets = assetsMatchingVersion(platformDownloads.assets, version);

  // For Windows, prefer .msi over .exe
  const windowsPreference = ['.msi', '.exe'];
  // For macOS, prefer .dmg over .app.tar.gz
  const macosPreference = ['.dmg', '.app.tar.gz'];
  // For Linux, prefer .AppImage over .deb
  const linuxPreference = ['.AppImage', '.deb'];

  // Determine preference order based on the asset types
  let preference: string[] = [];

  if (
    assets.some(
      (asset) => asset.name.endsWith('.msi') || asset.name.endsWith('.exe')
    )
  ) {
    preference = windowsPreference;
  } else if (
    assets.some(
      (asset) =>
        asset.name.endsWith('.dmg') || asset.name.endsWith('.app.tar.gz')
    )
  ) {
    preference = macosPreference;
  } else if (
    assets.some(
      (asset) => asset.name.endsWith('.AppImage') || asset.name.endsWith('.deb')
    )
  ) {
    preference = linuxPreference;
  }

  for (const ext of preference) {
    const asset = assets.find((a) => a.name.endsWith(ext));
    if (asset) {
      return asset;
    }
  }

  return assets[0] || null;
}
