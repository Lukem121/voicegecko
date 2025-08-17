'use client';

import { log } from '@acme/observability/log';
import TextType from '@acme/ui/components/text-type';
import { cn } from '@acme/ui/lib/utils';
import { AnimatePresence, motion } from 'motion/react';

import type { MascotMessage } from './mascot-chat-provider';

// Typing dots component for the typing effect
function TypingDots() {
  return (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          animate={{
            opacity: [0.4, 1, 0.4],
            scale: [0.8, 1, 0.8],
          }}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
          key={i}
          transition={{
            duration: 1.2,
            repeat: Number.POSITIVE_INFINITY,
            delay: i * 0.2,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// Chat bubble styles based on message type
const getBubbleStyles = (type: MascotMessage['type']) => {
  const baseStyles =
    'relative rounded-2xl px-4 py-3 shadow-lg backdrop-blur-sm border';

  switch (type) {
    case 'success':
      return cn(
        baseStyles,
        '!border-green-200 dark:!border-green-800 bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200'
      );
    case 'warning':
      return cn(
        baseStyles,
        '!border-yellow-200 dark:!border-yellow-800 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
      );
    case 'celebration':
      return cn(
        baseStyles,
        '!border-purple-200 dark:!border-purple-800 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-800 dark:from-purple-900/30 dark:to-pink-900/30 dark:text-purple-200'
      );
    case 'guidance':
      return cn(
        baseStyles,
        '!border-blue-200 dark:!border-blue-800 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
      );
    default:
      return cn(
        baseStyles,
        '!border-border bg-white/80 text-foreground dark:bg-black/20'
      );
  }
};

// Main chat bubble component
type MascotChatBubbleProps = {
  message: MascotMessage | null;
  isTyping: boolean;
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
};

export function MascotChatBubble({
  message,
  isTyping,
  className,
  position = 'bottom',
}: MascotChatBubbleProps) {
  // Don't render if no message and not typing
  if (!(message || isTyping)) {
    return null;
  }

  // Don't render if message exists but has no content
  if (message && (!message.content || message.content.trim() === '')) {
    log.warn(
      '[MascotChatBubble] Message with empty content detected, not rendering'
    );
    return null;
  }

  // Animation variants for different positions
  const getAnimationVariants = () => {
    const baseVariants = {
      hidden: { opacity: 0, scale: 0.8 },
      visible: {
        opacity: 1,
        scale: 1,
        transition: {
          type: 'spring' as const,
          stiffness: 300,
          damping: 20,
        },
      },
      exit: {
        opacity: 0,
        scale: 0.8,
        transition: {
          duration: 0.2,
        },
      },
    };

    switch (position) {
      case 'top':
        return {
          ...baseVariants,
          hidden: { ...baseVariants.hidden, y: 10 },
          visible: { ...baseVariants.visible, y: 0 },
          exit: { ...baseVariants.exit, y: -10 },
        };
      case 'left':
        return {
          ...baseVariants,
          hidden: { ...baseVariants.hidden, x: 10 },
          visible: { ...baseVariants.visible, x: 0 },
          exit: { ...baseVariants.exit, x: -10 },
        };
      case 'right':
        return {
          ...baseVariants,
          hidden: { ...baseVariants.hidden, x: -10 },
          visible: { ...baseVariants.visible, x: 0 },
          exit: { ...baseVariants.exit, x: 10 },
        };
      default: // bottom
        return {
          ...baseVariants,
          hidden: { ...baseVariants.hidden, y: -10 },
          visible: { ...baseVariants.visible, y: 0 },
          exit: { ...baseVariants.exit, y: 10 },
        };
    }
  };

  return (
    <AnimatePresence mode="wait">
      {(message ?? isTyping) && (
        <motion.div
          animate="visible"
          className={cn('relative max-w-sm', className)}
          exit="exit"
          initial="hidden"
          key={message?.id ?? 'typing'}
          variants={getAnimationVariants()}
        >
          <div
            className={cn(
              message ? getBubbleStyles(message.type) : getBubbleStyles('info')
            )}
          >
            {(() => {
              if (isTyping && !message) {
                // Show typing indicator when waiting for message
                return (
                  <div className="flex items-center space-x-2">
                    <TypingDots />
                    <span className="text-muted-foreground text-sm">
                      Thinking...
                    </span>
                  </div>
                );
              }
              if (message) {
                // Show message content
                return (
                  <div>
                    <p className="font-medium text-sm leading-relaxed">
                      <TextType
                        as="span"
                        className="inline"
                        loop={false}
                        showCursor={false}
                        startOnVisible={true}
                        text={message.content}
                        typingSpeed={10}
                      />
                    </p>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
