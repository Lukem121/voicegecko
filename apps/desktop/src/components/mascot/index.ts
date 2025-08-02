// Mascot Chat System Components
export {
  MascotChatProvider,
  useMascotChat,
  type MascotMessage,
  type MascotAnimation,
  type MascotState,
  type MascotChatContextValue,
} from "./mascot-chat-provider";

export { MascotChatBubble } from "./mascot-chat-bubble";

export {
  MascotCharacter,
  createMascotVariant,
  mascotVariants,
  type MascotComponentProps,
  type MascotVariant,
  type MascotVariantKey,
} from "./mascot-character";

export {
  MascotChat,
  OnboardingMascotChat,
  SidebarMascotChat,
  HelpMascotChat,
} from "./mascot-chat";

// Re-export common types for convenience
export type {
  MascotMessage as ChatMessage,
  MascotAnimation as ChatAnimation,
} from "./mascot-chat-provider";
