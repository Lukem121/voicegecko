/** v2 on-device model catalog — mirrors planned Rust `list_v2_models` payloads */

export type V2ModelId = 'qwen2_5_3b';

export type V2ModelStatus =
  | 'not_downloaded'
  | 'downloading'
  | 'ready'
  | 'error';

export type V2ModelCatalogEntry = {
  id: V2ModelId;
  name: string;
  description: string;
  sizeLabel: string;
  sizeBytes?: number;
};

export type V2ModelState = {
  id: V2ModelId;
  status: V2ModelStatus;
  progress: number;
  bytesDownloaded?: number;
  bytesTotal?: number;
  error?: string | null;
  installedPath?: string | null;
};

export type V2ModelListItem = V2ModelCatalogEntry & V2ModelState;

export type EngineCompareResult = {
  engineId: string;
  engineName: string;
  latencyMs: number;
  text: string;
  textSnippet: string;
  rating: number | null;
};

export type EngineCompareResponse = {
  sampleId: string;
  sampleLabel: string;
  results: EngineCompareResult[];
  /** True when backend compare command was unavailable */
  usedFallback: boolean;
};

export type LocalDictationRow = {
  id: string;
  content: string;
  engineId: string | null;
  mode: string | null;
  createdAt: string;
};
