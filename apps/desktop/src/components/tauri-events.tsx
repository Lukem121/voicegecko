import { useAppInitialization } from "~/hooks/use-app-initialization";

export function TauriEvents() {
  // Initialize the centralized event service
  useAppInitialization();

  return null;
}
