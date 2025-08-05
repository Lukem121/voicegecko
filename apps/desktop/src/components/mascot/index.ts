// Mascot Chat System Components

export {
  createMascotVariant,
  MascotCharacter,
  type MascotComponentProps,
  type MascotVariant,
  type MascotVariantKey,
  mascotVariants,
} from './mascot-character';
export {
  HelpMascotChat,
  MascotChat,
  OnboardingMascotChat,
  SidebarMascotChat,
} from './mascot-chat';
export { MascotChatBubble } from './mascot-chat-bubble';
// Re-export common types for convenience
export type {
  MascotAnimation as ChatAnimation,
  MascotMessage as ChatMessage,
} from './mascot-chat-provider';
export {
  type MascotAnimation,
  type MascotChatContextValue,
  MascotChatProvider,
  type MascotMessage,
  type MascotState,
  useMascotChat,
} from './mascot-chat-provider';
