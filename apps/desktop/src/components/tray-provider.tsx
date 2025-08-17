import { useTrayManager } from '~/hooks/use-tray-manager';

type TrayProviderProps = {
  children: React.ReactNode;
};

/**
 * TrayProvider manages the system tray menu with dynamic content.
 * The tray is now managed entirely in Rust, and this component
 * simply provides the data updates from React.
 */
export function TrayProvider({ children }: TrayProviderProps) {
  // Initialize tray manager - it handles everything automatically
  useTrayManager();

  return <>{children}</>;
}
