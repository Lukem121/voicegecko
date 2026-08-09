export type WhisperModelTier = 'minimal' | 'balanced' | 'quality' | 'maximum';

export type WhisperModelId = string;

export type WhisperModelStatus = 'not_downloaded' | 'downloading' | 'ready';

export type WhisperModelListItem = {
  id: WhisperModelId;
  name: string;
  description: string;
  sizeLabel: string;
  ramLabel: string;
  tier: WhisperModelTier;
  recommended: boolean;
  status: WhisperModelStatus;
  progress: number;
  selected: boolean;
};

export const WHISPER_TIER_ORDER: WhisperModelTier[] = [
  'minimal',
  'balanced',
  'quality',
  'maximum',
];

export const WHISPER_TIER_LABELS: Record<WhisperModelTier, string> = {
  minimal: 'Minimal — fastest, smallest models',
  balanced: 'Balanced — good everyday accuracy',
  quality: 'Quality — professional dictation',
  maximum: 'Maximum — best accuracy (large models)',
};

export type WhisperModelCompareResult = {
  modelId: string;
  modelName: string;
  text: string;
  textSnippet: string;
  latencyMs: number;
  available: boolean;
  selected: boolean;
};

export type WhisperModelCompareResponse = {
  sampleId: string;
  sampleLabel: string;
  results: WhisperModelCompareResult[];
};
