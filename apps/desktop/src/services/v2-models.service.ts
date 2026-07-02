import { log } from '@acme/observability/log';
import { invoke } from '@tauri-apps/api/core';
import type {
  EngineCompareResponse,
  EngineCompareResult,
  LocalDictationRow,
  V2ModelId,
  V2ModelListItem,
  V2ModelState,
  V2ModelStatus,
} from '~/types/v2-models';
import { V2_MODEL_CATALOG } from '~/types/v2-models.catalog';

const isMissingCommand = (error: unknown): boolean => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  return (
    message.includes('not found') ||
    message.includes('Unknown command') ||
    message.includes('command') && message.includes('not registered')
  );
};

const mergeCatalogWithState = (
  states: V2ModelState[]
): V2ModelListItem[] => {
  return V2_MODEL_CATALOG.map((entry) => {
    const state = states.find((item) => item.id === entry.id);
    return {
      ...entry,
      status: state?.status ?? 'not_downloaded',
      progress: state?.progress ?? 0,
      bytesDownloaded: state?.bytesDownloaded,
      bytesTotal: state?.bytesTotal,
      error: state?.error ?? null,
      installedPath: state?.installedPath ?? null,
    };
  });
};

const inferStatesFromEngineStatus = async (): Promise<V2ModelState[]> => {
  try {
    const engineStatus = await invoke<
      Array<{ id: string; available: boolean }>
    >('get_engine_status');
    const parakeetReady = engineStatus.some(
      (engine) => engine.id.includes('parakeet') && engine.available
    );
    const moonshineReady = engineStatus.some(
      (engine) => engine.id.includes('moonshine') && engine.available
    );
    return V2_MODEL_CATALOG.map((entry) => ({
      id: entry.id,
      status:
        (entry.id === 'parakeet_tdt_v2' && parakeetReady) ||
        (entry.id === 'moonshine_medium' && moonshineReady)
          ? ('ready' as const)
          : ('not_downloaded' as const),
      progress:
        (entry.id === 'parakeet_tdt_v2' && parakeetReady) ||
        (entry.id === 'moonshine_medium' && moonshineReady)
          ? 100
          : 0,
      error: null,
      installedPath: null,
    }));
  } catch {
    return V2_MODEL_CATALOG.map((entry) => ({
      id: entry.id,
      status: 'not_downloaded' as const,
      progress: 0,
      error: null,
      installedPath: null,
    }));
  }
};

const mapBackendStatus = (
  status: string,
  existsOnDisk?: boolean,
  manualInstall?: boolean
): V2ModelStatus => {
  if (status === 'downloaded' || existsOnDisk) {
    return 'ready';
  }
  if (status === 'manual_install') {
    return manualInstall && existsOnDisk ? 'ready' : 'not_downloaded';
  }
  if (status === 'downloading') {
    return 'downloading';
  }
  return 'not_downloaded';
};

type BackendV2ModelEntry = {
  id: string;
  name: string;
  description: string;
  size: string;
  localPath: string;
  status: string | { downloading?: { progress: number } };
  manualInstall?: boolean;
};

const mapBackendEntry = (entry: BackendV2ModelEntry): V2ModelListItem => {
  const catalog = V2_MODEL_CATALOG.find((item) => item.id === entry.id);
  const statusRaw =
    typeof entry.status === 'string'
      ? entry.status
      : entry.status.downloading
        ? 'downloading'
        : 'not_downloaded';
  const progress =
    typeof entry.status === 'object' && entry.status.downloading
      ? entry.status.downloading.progress
      : statusRaw === 'ready' || statusRaw === 'downloaded'
        ? 100
        : 0;

  return {
    id: entry.id as V2ModelId,
    name: entry.name,
    description: entry.description,
    sizeLabel: entry.size,
    status: mapBackendStatus(
      statusRaw,
      statusRaw === 'downloaded',
      entry.manualInstall
    ),
    progress,
    error: null,
    installedPath: entry.localPath,
  };
};

export async function listV2Models(): Promise<V2ModelListItem[]> {
  try {
    const entries = await invoke<BackendV2ModelEntry[]>('list_v2_models');
    return entries.map(mapBackendEntry);
  } catch (error) {
    if (!isMissingCommand(error)) {
      log.warn(error, '[V2Models] list_v2_models failed');
    }
    const inferred = await inferStatesFromEngineStatus();
    return mergeCatalogWithState(inferred);
  }
}

export async function getV2ModelStatus(
  modelId: V2ModelId
): Promise<V2ModelState> {
  try {
    return await invoke<V2ModelState>('get_v2_model_status', { modelId });
  } catch (error) {
    if (!isMissingCommand(error)) {
      log.warn(error, '[V2Models] get_v2_model_status failed');
    }
    const models = await listV2Models();
    const match = models.find((model) => model.id === modelId);
    if (!match) {
      throw new Error(`Unknown model: ${modelId}`);
    }
    return {
      id: match.id,
      status: match.status,
      progress: match.progress,
      bytesDownloaded: match.bytesDownloaded,
      bytesTotal: match.bytesTotal,
      error: match.error,
      installedPath: match.installedPath,
    };
  }
}

export async function downloadV2Model(modelId: V2ModelId): Promise<void> {
  try {
    await invoke('download_v2_model', { modelId });
  } catch (error) {
    if (isMissingCommand(error)) {
      throw new Error(
        'Model download is unavailable. Restart the app to retry automatic setup.'
      );
    }
    throw error;
  }
}

export async function deleteV2Model(modelId: V2ModelId): Promise<void> {
  try {
    await invoke('delete_v2_model', { modelId });
  } catch (error) {
    if (isMissingCommand(error)) {
      throw new Error(
        'Model deletion is unavailable. Restart the app to retry automatic setup.'
      );
    }
    throw error;
  }
}

const snippet = (text: string, max = 120): string => {
  const trimmed = text.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max)}…`;
};

const fallbackCompareFromLastDictation =
  async (): Promise<EngineCompareResponse> => {
    const rows = await invoke<LocalDictationRow[]>('list_local_dictations', {
      limit: 1,
    });
    const last = rows.at(0);
    if (!last) {
      throw new Error(
        'No dictation samples yet. Record with your mic, then compare again.'
      );
    }

    const result: EngineCompareResult = {
      engineId: last.engineId ?? 'unknown',
      engineName: last.engineId ?? 'Last session engine',
      latencyMs: 0,
      textSnippet: snippet(last.content),
      rating: null,
    };

    return {
      sampleId: last.id,
      sampleLabel: 'Last dictation (backend compare unavailable)',
      results: [result],
      usedFallback: true,
    };
  };

export async function compareEnginesOnSamples(): Promise<EngineCompareResponse> {
  try {
    const response = await invoke<EngineCompareResponse>(
      'compare_engines_on_samples'
    );
    return { ...response, usedFallback: false };
  } catch (error) {
    if (!isMissingCommand(error)) {
      log.warn(error, '[V2Models] compare_engines_on_samples failed');
      if (error instanceof Error && error.message.trim()) {
        throw error;
      }
    }
    return fallbackCompareFromLastDictation();
  }
}
