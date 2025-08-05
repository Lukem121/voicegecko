// Timing constants (in milliseconds)
export const TIMINGS = {
  TOOLTIP_DELAY: 500,
  RECENT_RECORDING_GRACE_PERIOD: 600,
  TRANSITION_TIMEOUT: 300,
  MOUSE_LEAVE_COLLAPSE_DELAY: 200,
} as const;

// Size constants (in pixels)
export const DIMENSIONS = {
  HITBOX: {
    WIDTH: 115,
    HEIGHT: 35,
  },
  BAR: {
    COLLAPSED_WIDTH: 40,
    COLLAPSED_HEIGHT: 8,
    HOVER_WIDTH: 75,
    HOVER_HEIGHT: 30,
    EXPANDED_WIDTH: 110,
    EXPANDED_HEIGHT: 30,
  },
  BUTTON: {
    SIZE: 20,
    PADDING: 4,
    ICON_SIZE: 12,
    FINISH_ICON_SIZE: 10,
  },
} as const;

// Animation configuration
export const ANIMATIONS = {
  SPRING: {
    STIFFNESS: 400,
    DAMPING: 30,
    MASS: 0.8,
  },
  TOOLTIP: {
    STIFFNESS: 350,
    DAMPING: 30,
    DURATION: 0.2,
  },
  BUTTON_TRANSITION: {
    OPACITY_DURATION: 0.3,
    ICON_DURATION: 0.15,
  },
} as const;

// Audio configuration
export const AUDIO = {
  DEFAULT_SENSITIVITY: 35,
  AMPLIFICATION_CURVE: 0.6,
  MAX_LEVEL: 1.0,
  FREQUENCY_BANDS_COUNT: 10,
} as const;

// Visual styling constants
export const STYLES = {
  PATTERN_OPACITY: 0.1,
  PATTERN_SIZE: 40,
  STROKE_WIDTH: 3,
  BORDER_RADIUS: 'rounded-full',
  Z_INDEX: 50,
} as const;

// Default audio level structure
export const DEFAULT_AUDIO_LEVEL = {
  level: 0,
  peak: 0,
  frequency_bands: new Array<number>(AUDIO.FREQUENCY_BANDS_COUNT).fill(0),
  dominant_frequency: 0,
  spectral_centroid: 0,
  spectral_rolloff: 0,
  zero_crossing_rate: 0,
  is_voice_detected: false,
  is_silence: true,
} as const;

// SVG pattern for gecko scales background
export const GECKO_PATTERN_SVG = `url("data:image/svg+xml,<svg id='patternId' width='100%' height='100%' xmlns='http://www.w3.org/2000/svg'><defs><pattern id='a' patternUnits='userSpaceOnUse' width='20' height='20' patternTransform='rotate(55)'><rect x='0' y='0' width='100%' height='100%' fill='%23272529ff'/><path d='M-10-10A10 10 0 00-20 0a10 10 0 0010 10A10 10 0 010 0a10 10 0 00-10-10zM10-10A10 10 0 000 0a10 10 0 0110 10A10 10 0 0120 0a10 10 0 00-10-10zM30-10A10 10 0 0020 0a10 10 0 0110 10A10 10 0 0140 0a10 10 0 00-10-10zM-10 10a10 10 0 00-10 10 10 10 0 0010 10A10 10 0 010 20a10 10 0 00-10-10zM10 10A10 10 0 000 20a10 10 0 0110 10 10 10 0 0110-10 10 10 0 00-10-10zM30 10a10 10 0 00-10 10 10 10 0 0110 10 10 10 0 0110-10 10 10 0 00-10-10z'  stroke-width='0.5' stroke='%236e9c4aff' fill='none'/></pattern></defs><rect width='800%' height='800%' transform='translate(0,-2)' fill='url(%23a)'/></svg>")`;
