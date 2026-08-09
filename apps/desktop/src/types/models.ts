export type HardwareInfo = {
  cpu_count: number;
  cpu_frequency: number;
  total_memory: number;
  available_memory: number;
  cpu_vendor: string;
  cpu_brand: string;
  has_avx: boolean;
  has_avx2: boolean;
  capability_score: number;
  recommended_tier: ModelTier;
};

export type ModelTier =
  | 'cloud'
  | 'minimal'
  | 'balanced'
  | 'quality'
  | 'maximum';

export type TierDisplayInfo = {
  name: string;
  description: string;
  icon: string;
  min_ram_gb: number;
  typical_model_size_mb: number;
};

export const tierDisplayInfo: Record<ModelTier, TierDisplayInfo> = {
  cloud: {
    name: 'Cloud Provider',
    description:
      'Highest accuracy with our cloud infrastructure. Requires internet connection.',
    icon: '☁️',
    min_ram_gb: 0,
    typical_model_size_mb: 0,
  },
  minimal: {
    name: 'Minimal',
    description: 'Fast and lightweight for quick notes and basic dictation.',
    icon: '⚡',
    min_ram_gb: 2,
    typical_model_size_mb: 79,
  },
  balanced: {
    name: 'Balanced',
    description:
      'Good accuracy for everyday use, meetings, and general dictation.',
    icon: '⚖️',
    min_ram_gb: 4,
    typical_model_size_mb: 181,
  },
  quality: {
    name: 'Quality',
    description:
      'Enhanced accuracy for professional needs, interviews, and complex audio.',
    icon: '✨',
    min_ram_gb: 8,
    typical_model_size_mb: 466,
  },
  maximum: {
    name: 'Maximum',
    description: 'Best possible accuracy with advanced language understanding.',
    icon: '🚀',
    min_ram_gb: 16,
    typical_model_size_mb: 547,
  },
};
