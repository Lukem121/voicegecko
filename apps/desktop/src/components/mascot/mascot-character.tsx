'use client';

import GeckoFullBody from '@acme/ui/components/geckos/gecko-full-body';
import { cn } from '@acme/ui/lib/utils';
import { motion } from 'motion/react';
import type React from 'react';

import type { MascotAnimation } from './mascot-chat-provider';

// Type for mascot component props
export interface MascotComponentProps {
  className?: string;
  style?: React.CSSProperties;
}

// Type for different mascot variants
export interface MascotVariant {
  component: React.ComponentType<MascotComponentProps>;
  name: string;
  description?: string;
}

// Animation configurations for different states
const getAnimationConfig = (animation: MascotAnimation) => {
  const { type, intensity = 'medium', duration } = animation;

  const intensityMultipliers = {
    low: 0.6,
    medium: 1,
    high: 1.4,
  };

  const multiplier = intensityMultipliers[intensity];

  switch (type) {
    case 'welcoming':
      return {
        animate: {
          rotate: [-3 * multiplier, 3 * multiplier, -3 * multiplier, 0],
          scale: [1, 1.05 * multiplier, 1, 1],
        },
        transition: {
          duration: duration ? duration / 1000 : 2,
          ease: 'easeInOut' as const,
          times: [0, 0.3, 0.7, 1],
        },
      };

    case 'celebrating':
      return {
        animate: {
          y: [0, -8 * multiplier, 0, -4 * multiplier, 0],
          rotate: [0, 5 * multiplier, -5 * multiplier, 0],
          scale: [1, 1.1 * multiplier, 0.95, 1.05 * multiplier, 1],
        },
        transition: {
          duration: duration ? duration / 1000 : 1.5,
          ease: 'easeInOut' as const,
          repeat: intensity === 'high' ? 2 : 1,
        },
      };

    case 'thinking':
      return {
        animate: {
          rotate: [0, -2 * multiplier, 2 * multiplier, -1 * multiplier, 0],
          scale: [1, 1.02 * multiplier, 0.98, 1.01 * multiplier, 1],
        },
        transition: {
          duration: duration ? duration / 1000 : 3,
          ease: 'easeInOut' as const,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: 'reverse' as const,
        },
      };

    case 'listening':
      return {
        animate: {
          scale: [1, 1.05 * multiplier, 1],
          rotate: [0, 1 * multiplier, -1 * multiplier, 0],
        },
        transition: {
          duration: duration ? duration / 1000 : 2,
          ease: 'easeInOut' as const,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: 'reverse' as const,
        },
      };

    case 'processing':
      return {
        animate: {
          rotate: [0, 360],
          scale: [1, 1.1 * multiplier, 1],
        },
        transition: {
          rotate: {
            duration: duration ? duration / 1000 : 2,
            ease: 'linear' as const,
            repeat: Number.POSITIVE_INFINITY,
          },
          scale: {
            duration: 1,
            ease: 'easeInOut' as const,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: 'reverse' as const,
          },
        },
      };

    case 'dancing':
      return {
        animate: {
          y: [0, -8 * multiplier, 0, -4 * multiplier, 0],
          x: [0, 3 * multiplier, -3 * multiplier, 0],
          rotate: [0, 8 * multiplier, -8 * multiplier, 5 * multiplier, 0],
          scale: [1, 1.05 * multiplier, 0.95, 1.1 * multiplier, 1],
        },
        transition: {
          duration: duration ? duration / 1000 : 1.8,
          ease: 'easeInOut' as const,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: 'loop' as const,
        },
      };

    case 'idle':
    default:
      return {
        animate: {
          y: [0, -2, 0],
          rotate: [0, 0.5, 0, -0.5, 0],
        },
        transition: {
          duration: 4,
          ease: 'easeInOut' as const,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: 'reverse' as const,
        },
      };
  }
};

// Additional floating animation for idle states
const getFloatingAnimation = (isEnabled: boolean) => {
  if (!isEnabled) return {};

  return {
    y: [0, -3, 0],
    transition: {
      duration: 3,
      ease: 'easeInOut' as const,
      repeat: Number.POSITIVE_INFINITY,
      repeatType: 'reverse' as const,
    },
  };
};

// Hover effects for interactive mascots
const getHoverEffects = (enableHover: boolean) => {
  if (!enableHover) return {};

  return {
    whileHover: {
      scale: 1.05,
      rotate: 2,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 20,
      },
    },
    whileTap: {
      scale: 0.95,
      transition: {
        duration: 0.1,
      },
    },
  };
};

// Props for the MascotCharacter component
interface MascotCharacterProps {
  variant: MascotVariant;
  animation: MascotAnimation;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  enableFloating?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

// Size configurations
const sizeClasses = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-32 w-32',
  xl: 'h-40 w-40',
  '2xl': 'h-48 w-48',
};

export function MascotCharacter({
  variant,
  animation,
  className,
  size = 'lg',
  enableFloating = true,
  onClick,
  style,
}: MascotCharacterProps) {
  const MascotComponent = variant.component;

  // For composite variants that handle their own animation, use idle animation for container
  const isCompositeVariant = variant.name === 'Dancing Gecko with Confetti';
  const isDancingComposite = isCompositeVariant && animation.type === 'dancing';

  const containerAnimation = isDancingComposite
    ? {
        type: 'idle' as const,
        intensity: animation.intensity,
        duration: animation.duration,
      }
    : animation;

  const animationConfig = getAnimationConfig(containerAnimation);
  const floatingAnimation = getFloatingAnimation(
    enableFloating && containerAnimation.type === 'idle' && !isDancingComposite
  );
  // Combine animations - floating is base layer, specific animation on top
  // For dancing composite, keep container completely static
  const combinedAnimation = isDancingComposite
    ? {}
    : {
        ...floatingAnimation,
        ...animationConfig.animate,
      };

  return (
    <motion.div
      animate={combinedAnimation}
      className={cn(
        'relative cursor-pointer select-none',
        sizeClasses[size],
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      style={style}
      transition={isDancingComposite ? {} : animationConfig.transition}
    >
      <MascotComponent
        className="h-full w-full object-contain"
        style={{
          filter:
            animation.type === 'processing' ||
            (animation.type === 'dancing' && !isDancingComposite)
              ? 'brightness(1.1)'
              : undefined,
        }}
      />

      {/* Optional glow effect for special states */}
      {(animation.type === 'celebrating' ||
        animation.type === 'processing' ||
        animation.type === 'dancing') && (
        <motion.div
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.2, 1],
          }}
          className="absolute inset-0 rounded-full opacity-30"
          style={{
            background:
              animation.type === 'celebrating' || animation.type === 'dancing'
                ? 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
          }}
          transition={{
            duration: 1.5,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
          }}
        />
      )}
    </motion.div>
  );
}

// Helper component for creating mascot variants
export function createMascotVariant(
  component: React.ComponentType<MascotComponentProps>,
  name: string,
  description?: string
): MascotVariant {
  return {
    component,
    name,
    description,
  };
}

// Pre-built mascot variants (you can add more as you create different mascot components)
export const mascotVariants = {
  // This is the default gecko - using the existing GeckoFullBody component
  default: createMascotVariant(
    ({ className, style }: MascotComponentProps) => (
      <GeckoFullBody
        className={className}
        style={{ ...style, transform: 'scaleX(-1)' }}
      />
    ),
    'Default Gecko',
    'The standard VoiceGecko mascot'
  ),

  // Gecko with microphone for audio setup steps
  withMicrophone: createMascotVariant(
    ({ className, style }: MascotComponentProps) => (
      <img
        alt="Voice Gecko on laptop with microphone"
        className={className}
        src="/geckos/gecko-laptop-w-mic.png"
        style={style}
      />
    ),
    'Gecko with Microphone',
    'VoiceGecko mascot for microphone and audio setup'
  ),

  withWelcomeSign: createMascotVariant(
    ({ className, style }: MascotComponentProps) => (
      <img
        alt="Voice Gecko on welcome sign"
        className={className}
        src="/geckos/gecko-welcome-sign-small.png"
        style={style}
      />
    ),
    'Gecko with Welcome Sign',
    'VoiceGecko mascot for welcome sign'
  ),
  // Dancing gecko with confetti background - composite variant
  dancingWithConfetti: createMascotVariant(
    ({ className, style }: MascotComponentProps) => (
      <div className={className} style={style}>
        {/* Static confetti background */}
        <img
          alt="Confetti background"
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          src="/geckos/confeti-bg.png"
          style={{ zIndex: 1 }}
        />
        {/* Animated dancing gecko */}
        <motion.img
          alt="Dancing Voice Gecko"
          animate={{
            y: [0, -4, 0, -2, 0],
            x: [0, 1, 0, -1, 0],
            rotate: [0, 2, 0, -2, 0],
            scale: [1, 1.02, 1, 1.01, 1],
          }}
          className="relative h-full w-full object-contain"
          src="/geckos/gecko-dancing.png"
          style={{
            zIndex: 2,
            filter: 'brightness(1.1)',
          }}
          transition={{
            duration: 2.2,
            ease: 'easeInOut',
            repeat: Number.POSITIVE_INFINITY,
            repeatType: 'loop',
          }}
        />
      </div>
    ),
    'Dancing Gecko with Confetti',
    'VoiceGecko mascot dancing with confetti background'
  ),

  // Example of how you might add more variants in the future:
  // withHeadphones: createMascotVariant(GeckoWithHeadphones, "Gecko with Headphones"),
  // sleeping: createMascotVariant(GeckoSleeping, "Sleeping Gecko"),
} as const;

// Type for the pre-built variants
export type MascotVariantKey = keyof typeof mascotVariants;
