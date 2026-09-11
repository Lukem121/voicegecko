import type { V2ModelCatalogEntry } from '~/types/v2-models';

export const V2_MODEL_CATALOG: V2ModelCatalogEntry[] = [
  {
    id: 'qwen2_5_3b',
    name: 'Qwen2.5 3B (polish)',
    description:
      'Optional local LLM for post-dictation polish. Downloaded automatically when polish is enabled.',
    sizeLabel: '~2 GB',
    sizeBytes: 2_000_000_000,
  },
];
