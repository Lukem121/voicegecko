import type { V2ModelCatalogEntry } from '~/types/v2-models';

export const V2_MODEL_CATALOG: V2ModelCatalogEntry[] = [
  {
    id: 'silero_vad',
    name: 'Silero VAD',
    description: 'Voice activity detection for hands-free and streaming modes.',
    sizeLabel: '~2 MB',
    sizeBytes: 2_000_000,
  },
  {
    id: 'parakeet_tdt_v2',
    name: 'Parakeet TDT v2',
    description:
      'Default local STT engine for toggle batch and push-to-talk modes.',
    sizeLabel: '~600 MB',
    sizeBytes: 600_000_000,
  },
  {
    id: 'moonshine_medium',
    name: 'Moonshine Medium (manual)',
    description:
      'Streaming STT for flow/hands-free modes. Requires moonshine.dll and ORT models.',
    sizeLabel: 'varies',
  },
  {
    id: 'qwen2_5_3b',
    name: 'Qwen2.5 3B (polish)',
    description:
      'Optional local LLM for post-dictation polish. Downloaded automatically when polish is enabled.',
    sizeLabel: '~2 GB',
    sizeBytes: 2_000_000_000,
  },
];
