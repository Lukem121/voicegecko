import { invoke } from '@tauri-apps/api/core';
import type {
  WhisperModelCompareResponse,
  WhisperModelId,
  WhisperModelListItem,
  WhisperModelStatus,
  WhisperModelTier,
} from '~/types/whisper-models';

type BackendWhisperModelEntry = {
  id: string;
  name: string;
  description: string;
  size: string;
  ram: string;
  tier: string;
  recommended: boolean;
  status: 'NotDownloaded' | 'Downloaded' | { Downloading: number };
  selected: boolean;
};

const mapStatus = (
  status: BackendWhisperModelEntry['status']
): { status: WhisperModelStatus; progress: number } => {
  if (status === 'Downloaded') {
    return { status: 'ready', progress: 100 };
  }
  if (typeof status === 'object' && 'Downloading' in status) {
    return { status: 'downloading', progress: status.Downloading };
  }
  return { status: 'not_downloaded', progress: 0 };
};

const mapTier = (tier: string): WhisperModelTier => {
  if (
    tier === 'minimal' ||
    tier === 'balanced' ||
    tier === 'quality' ||
    tier === 'maximum'
  ) {
    return tier;
  }
  return 'minimal';
};

const mapEntry = (entry: BackendWhisperModelEntry): WhisperModelListItem => {
  const mapped = mapStatus(entry.status);
  return {
    id: entry.id,
    name: entry.name,
    description: entry.description,
    sizeLabel: entry.size,
    ramLabel: entry.ram,
    tier: mapTier(entry.tier),
    recommended: entry.recommended,
    status: mapped.status,
    progress: mapped.progress,
    selected: entry.selected,
  };
};

export async function listWhisperModels(): Promise<WhisperModelListItem[]> {
  const entries = await invoke<BackendWhisperModelEntry[]>(
    'list_gpu_whisper_models'
  );
  return entries.map(mapEntry);
}

export async function getSelectedWhisperModelId(): Promise<WhisperModelId> {
  return invoke<string>('get_gpu_whisper_model_id');
}

export async function setSelectedWhisperModelId(
  modelId: WhisperModelId
): Promise<void> {
  await invoke('set_gpu_whisper_model_id', { modelId });
}

export async function downloadWhisperModel(modelId: WhisperModelId): Promise<void> {
  await invoke('download_model', { modelId });
}

export async function cancelWhisperModelDownload(
  modelId: WhisperModelId
): Promise<void> {
  await invoke('cancel_model_download', { modelId });
}

export async function deleteWhisperModel(modelId: WhisperModelId): Promise<void> {
  await invoke('delete_model', { modelId });
}

type BackendWhisperCompareResult = {
  modelId: string;
  modelName: string;
  text: string;
  textSnippet: string;
  latencyMs: number;
  available: boolean;
  selected: boolean;
};

type BackendWhisperCompareResponse = {
  sampleId: string;
  sampleLabel: string;
  results: BackendWhisperCompareResult[];
};

export async function compareReadyWhisperModelsOnSamples(): Promise<WhisperModelCompareResponse> {
  const response = await invoke<BackendWhisperCompareResponse>(
    'compare_ready_whisper_models_on_samples'
  );
  return response;
}
