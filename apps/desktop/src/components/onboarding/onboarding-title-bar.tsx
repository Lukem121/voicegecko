import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";

import LogoText from "@acme/ui/components/logos/logo-text";
import { Button } from "@acme/ui/components/ui/button";

const appWindow = getCurrentWindow();

export function OnboardingTitleBar() {
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
        {/* Left side - Logo */}
        <div className="flex items-center gap-2">
          {/* <GeckoFullBody className="pointer-events-auto -mb-[10px] h-9 origin-bottom cursor-pointer transition-transform duration-150 hover:-rotate-3" /> */}
          <LogoText className="h-7 pt-1.5 pl-1" />
        </div>

        {/* Right side - Window Controls */}
        <div className="pointer-events-auto flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-muted/50 h-8 w-8 p-0"
            onClick={handleMinimize}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-muted/50 h-8 w-8 p-0"
            onClick={handleMaximize}
          >
            <Square className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-destructive/20 hover:text-destructive h-8 w-8 p-0"
            onClick={handleClose}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
