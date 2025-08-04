'use client';

import { cn } from '@acme/ui/lib/utils';
import { AnimatePresence, motion } from 'motion/react';
import React from 'react';

import type { MascotVariant } from './mascot-character';
import { MascotCharacter } from './mascot-character';
import { MascotChatBubble } from './mascot-chat-bubble';
import { useMascotChat } from './mascot-chat-provider';

// Layout configurations
type MascotChatLayout =
  | 'bubble-top' // Chat bubble appears above mascot
  | 'bubble-bottom' // Chat bubble appears below mascot
  | 'bubble-left' // Chat bubble appears to the left of mascot
  | 'bubble-right' // Chat bubble appears to the right of mascot
  | 'bubble-floating'; // Chat bubble floats above mascot with absolute positioning

interface MascotChatProps {
  variant: MascotVariant;
  layout?: MascotChatLayout;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  chatBubbleClassName?: string;
  mascotClassName?: string;
  enableMascotHover?: boolean;
  enableMascotFloating?: boolean;
  onMascotClick?: () => void;
  // Layout-specific spacing
  spacing?: 'sm' | 'md' | 'lg';
}

// Spacing configurations
const spacingClasses = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

// Layout component configurations
const getLayoutClasses = (layout: MascotChatLayout, spacing: string) => {
  switch (layout) {
    case 'bubble-top':
      return {
        container: cn('flex flex-col items-center', spacing),
        bubbleOrder: 'order-first',
        mascotOrder: 'order-last',
        bubblePosition: 'bottom' as const,
      };

    case 'bubble-bottom':
      return {
        container: cn('flex flex-col items-center', spacing),
        bubbleOrder: 'order-last',
        mascotOrder: 'order-first',
        bubblePosition: 'top' as const,
      };

    case 'bubble-left':
      return {
        container: cn('flex flex-row items-center', spacing),
        bubbleOrder: 'order-first',
        mascotOrder: 'order-last',
        bubblePosition: 'right' as const,
      };

    case 'bubble-right':
      return {
        container: cn('flex flex-row items-center', spacing),
        bubbleOrder: 'order-last',
        mascotOrder: 'order-first',
        bubblePosition: 'left' as const,
      };

    case 'bubble-floating':
      return {
        container: 'relative flex items-center justify-center',
        bubbleOrder: '',
        mascotOrder: '',
        bubblePosition: 'top' as const,
      };
  }
};

export function MascotChat({
  variant,
  layout = 'bubble-top',
  size = 'lg',
  className,
  chatBubbleClassName,
  mascotClassName,
  enableMascotHover = true,
  enableMascotFloating = true,
  onMascotClick,
  spacing = 'md',
}: MascotChatProps) {
  const { state } = useMascotChat();
  const { currentMessage, isTyping, currentAnimation, isVisible } = state;

  const layoutConfig = getLayoutClasses(layout, spacingClasses[spacing]);

  if (!isVisible) {
    return null;
  }

  // For floating layout, we need absolute positioning
  if (layout === 'bubble-floating') {
    return (
      <div className={cn('relative', className)}>
        {/* Mascot */}
        <MascotCharacter
          animation={currentAnimation}
          className={mascotClassName}
          enableFloating={enableMascotFloating}
          onClick={onMascotClick}
          size={size}
          variant={variant}
        />

        {/* Floating chat bubble */}
        {(currentMessage || isTyping) && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              '-translate-x-1/2 absolute bottom-full left-1/2 mb-4',
              chatBubbleClassName
            )}
            exit={{ opacity: 0, y: 10 }}
            initial={{ opacity: 0, y: 10 }}
          >
            <MascotChatBubble
              isTyping={isTyping}
              message={currentMessage}
              position={layoutConfig.bubblePosition}
            />
          </motion.div>
        )}
      </div>
    );
  }

  // For standard layouts, use flexbox
  return (
    <div className={cn(layoutConfig.container, className)}>
      {/* Chat Bubble */}
      <div className={cn(layoutConfig.bubbleOrder, chatBubbleClassName)}>
        <MascotChatBubble
          isTyping={isTyping}
          message={currentMessage}
          position={layoutConfig.bubblePosition}
        />
      </div>

      {/* Mascot Character */}
      <div className={cn(layoutConfig.mascotOrder, mascotClassName)}>
        <MascotCharacter
          animation={currentAnimation}
          enableFloating={enableMascotFloating}
          onClick={onMascotClick}
          size={size}
          variant={variant}
        />
      </div>
    </div>
  );
}

// Convenience component with preset styling for onboarding
interface OnboardingMascotChatProps {
  variant: MascotVariant;
  className?: string;
  onMascotClick?: () => void;
}

export function OnboardingMascotChat({
  variant,
  className,
  onMascotClick,
}: OnboardingMascotChatProps) {
  const { state } = useMascotChat();
  const { currentMessage, isTyping, currentAnimation, isVisible } = state;

  if (!isVisible) {
    return null;
  }

  return (
    <div className={cn('flex h-full flex-col justify-between p-8', className)}>
      {/* Top section - Speech bubble area */}
      <div className="flex flex-1 items-center justify-center">
        <AnimatePresence mode="wait">
          {(currentMessage || isTyping) && (
            <motion.div
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="flex w-full max-w-lg justify-center"
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 25,
              }}
            >
              <MascotChatBubble
                className="w-full"
                isTyping={isTyping}
                message={currentMessage}
                position="bottom"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom section - Mascot (fixed position) */}
      <div className="flex flex-shrink-0 justify-center">
        <MascotCharacter
          animation={currentAnimation}
          className="flex-shrink-0"
          enableFloating={true}
          onClick={onMascotClick}
          size={variant.name === 'Dancing Gecko with Confetti' ? '2xl' : 'xl'}
          variant={variant}
        />
      </div>
    </div>
  );
}

// Convenience component for sidebar mascot (smaller, compact)
interface SidebarMascotChatProps {
  variant: MascotVariant;
  className?: string;
  onMascotClick?: () => void;
}

export function SidebarMascotChat({
  variant,
  className,
  onMascotClick,
}: SidebarMascotChatProps) {
  return (
    <MascotChat
      chatBubbleClassName="max-w-xs"
      className={cn('w-fit', className)}
      enableMascotFloating={false}
      enableMascotHover={true}
      layout="bubble-floating"
      onMascotClick={onMascotClick}
      size="md"
      variant={variant}
    />
  );
}

// Convenience component for help tooltips
interface HelpMascotChatProps {
  variant: MascotVariant;
  className?: string;
  onMascotClick?: () => void;
}

export function HelpMascotChat({
  variant,
  className,
  onMascotClick,
}: HelpMascotChatProps) {
  return (
    <MascotChat
      chatBubbleClassName="max-w-xs"
      className={cn('inline-flex', className)}
      enableMascotFloating={false}
      enableMascotHover={true}
      layout="bubble-left"
      onMascotClick={onMascotClick}
      size="sm"
      spacing="sm"
      variant={variant}
    />
  );
}
