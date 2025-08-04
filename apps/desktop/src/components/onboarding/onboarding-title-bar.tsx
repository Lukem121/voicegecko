import LogoText from '@acme/ui/components/logos/logo-text';
import { Button } from '@acme/ui/components/ui/button';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X } from 'lucide-react';

const appWindow = getCurrentWindow();

export function OnboardingTitleBar() {
  const handleMinimize = () => {
    appWindow.minimize();
  };

  const handleMaximize = () => {
    appWindow.toggleMaximize();
  };

  const handleClose = () => {
    appWindow.close();
  };

  return (
    <div className="fixed top-0 right-0 left-0 z-[9999] flex h-12 select-none border-border border-b bg-background">
      <div className="h-full flex-1" data-tauri-drag-region />

      <div className="pointer-events-none absolute top-0 right-0 left-2 flex h-full items-center justify-between">
        {/* Left side - Logo */}
        <div className="flex items-center gap-2">
          {/* <GeckoFullBody className="pointer-events-auto -mb-[10px] h-9 origin-bottom cursor-pointer transition-transform duration-150 hover:-rotate-3" /> */}
          <LogoText className="h-7 pt-1.5 pl-1" />
        </div>

        {/* Right side - Window Controls */}
        <div className="pointer-events-auto flex items-center">
          <Button
            className="h-8 w-8 p-0 hover:bg-muted/50"
            onClick={handleMinimize}
            size="sm"
            variant="ghost"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Button
            className="h-8 w-8 p-0 hover:bg-muted/50"
            onClick={handleMaximize}
            size="sm"
            variant="ghost"
          >
            <Square className="h-3 w-3" />
          </Button>
          <Button
            className="h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive"
            onClick={handleClose}
            size="sm"
            variant="ghost"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
