import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X } from 'lucide-react';

const appWindow = getCurrentWindow();

export function AuthTitleBar() {
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
    <div className="fixed top-0 right-0 left-0 z-[9999] flex h-12 select-none">
      {/* Drag region */}
      <div className="h-full flex-1" data-tauri-drag-region />

      {/* Window Controls */}
      <div className="pointer-events-auto absolute top-0 right-0 flex items-center">
        <button
          className="flex h-8 w-8 cursor-pointer items-center justify-center border-none bg-transparent text-muted-foreground transition-colors duration-150 hover:bg-muted/50 hover:text-foreground active:bg-muted/70"
          onClick={handleMinimize}
          title="Minimize"
          type="button"
        >
          <Minus className="h-3 w-3" />
        </button>
        <button
          className="flex h-8 w-8 cursor-pointer items-center justify-center border-none bg-transparent text-muted-foreground transition-colors duration-150 hover:bg-muted/50 hover:text-foreground active:bg-muted/70"
          onClick={handleMaximize}
          title="Maximize"
          type="button"
        >
          <Square className="h-3 w-3" />
        </button>
        <button
          className="flex h-8 w-8 cursor-pointer items-center justify-center border-none bg-transparent text-muted-foreground transition-colors duration-150 hover:bg-destructive/20 hover:text-destructive active:bg-destructive/30"
          onClick={handleClose}
          title="Close"
          type="button"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
