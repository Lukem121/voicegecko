import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { PanelLeftIcon } from "lucide-react";

import GeckoFullBody from "@acme/ui/components/geckos/gecko-full-body";
import LogoText from "@acme/ui/components/logos/logo-text";
import { useSidebar } from "@acme/ui/components/ui/sidebar";

const appWindow = getCurrentWindow();

export function TitleBar() {
  const { toggleSidebar } = useSidebar();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Check initial maximize state
    const checkMaximized = async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    };

    void checkMaximized();

    // Listen for resize events to update maximize state
    const unlistenResize = appWindow.onResized(() => {
      void checkMaximized();
    });

    return () => {
      void unlistenResize.then((fn) => fn());
    };
  }, []);

  const handleMinimize = () => {
    void appWindow.minimize();
  };

  const handleMaximize = () => {
    void appWindow.toggleMaximize();
  };

  const handleClose = () => {
    void appWindow.close();
  };

  return (
    <div className="bg-background border-border fixed top-0 right-0 left-0 z-[9999] flex h-12 border-b select-none">
      <div data-tauri-drag-region className="h-full flex-1" />
      <div className="pointer-events-none absolute top-0 right-0 left-2 flex h-full items-center justify-between">
        <div className="flex items-center gap-2">
          <GeckoFullBody className="pointer-events-auto -mb-[10px] h-9 origin-bottom cursor-pointer transition-transform duration-150 hover:-rotate-3" />
          <LogoText className="h-7 pt-1.5 pl-1" />
        </div>

        <div className="pointer-events-auto flex">
          <button
            className="text-foreground hover:bg-accent active:bg-accent/80 flex h-8 w-8 cursor-pointer items-center justify-center border-none bg-transparent transition-colors duration-150"
            onClick={toggleSidebar}
            title="Minimize"
          >
            <PanelLeftIcon className="h-3 w-3" />
          </button>
          <button
            className="text-foreground hover:bg-accent active:bg-accent/80 flex h-8 w-8 cursor-pointer items-center justify-center border-none bg-transparent transition-colors duration-150"
            onClick={handleMinimize}
            title="Minimize"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 6h8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            className="text-foreground hover:bg-accent active:bg-accent/80 flex h-8 w-8 cursor-pointer items-center justify-center border-none bg-transparent transition-colors duration-150"
            onClick={handleMaximize}
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M3 4.5h6v6H3V4.5zM4.5 3V1.5h6v6H9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect
                  x="2"
                  y="2"
                  width="8"
                  height="8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
          <button
            className="text-foreground flex h-8 w-8 cursor-pointer items-center justify-center border-none bg-transparent transition-colors duration-150 hover:bg-red-500 hover:text-white active:bg-red-600 active:text-white"
            onClick={handleClose}
            title="Close"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 3l6 6m0-6l-6 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
