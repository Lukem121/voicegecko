import { createFileRoute } from "@tanstack/react-router";
import {
  Command,
  Keyboard,
  Loader2,
  RotateCcw,
  Settings2,
  Zap,
} from "lucide-react";

import { Badge } from "@acme/ui/components/ui/badge";
import { Button } from "@acme/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@acme/ui/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@acme/ui/components/ui/tooltip";

import { ShortcutRecorder } from "~/components/shortcut-recorder";
import { useShortcuts } from "~/hooks/use-shortcuts";
import { formatKeysForDisplay, getOS } from "~/lib/shortcuts/utils";

export const Route = createFileRoute("/_authenticated/settings/shortcuts")({
  component: ShortcutsPage,
});

function ShortcutsPage() {
  const {
    shortcutCategories,
    resetShortcuts,
    isLoading,
    updateShortcut,
    isRecording,
    startRecording,
    stopRecording,
    cancelRecording,
    recordingActionId,
  } = useShortcuts();
  const os = getOS();

  const handleResetShortcuts = () => {
    void resetShortcuts();
  };

  const handleSaveShortcut = (keys: string[]) => {
    if (recordingActionId) {
      void updateShortcut(recordingActionId, keys);
    }
    stopRecording();
  };

  const handleCancelRecording = () => {
    void cancelRecording();
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">Loading shortcuts...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <ShortcutRecorder
        isOpen={isRecording}
        onClose={handleCancelRecording}
        onSave={handleSaveShortcut}
        actionName={
          shortcutCategories
            .flatMap((c) => c.shortcuts)
            .find((s) => s.id === recordingActionId)?.name ?? ""
        }
      />
      <div className="flex flex-1 flex-col gap-4">
        {/* Header with future configuration option */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold">Keyboard Shortcuts</h2>
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                Learn the shortcuts to speed up your workflow
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetShortcuts}
                    className="ml-4"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset to Defaults
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Restore all shortcuts to their default values</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Shortcut Categories */}
        <div className="grid gap-6">
          {shortcutCategories.map((category) => (
            <Card key={category.name}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Keyboard className="h-5 w-5" />
                  {category.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {category.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.id}
                      className="flex items-center justify-between border-b py-2 last:border-b-0"
                    >
                      <span className="text-sm">{shortcut.name}</span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          {formatKeysForDisplay(shortcut.keys, os).map(
                            (key, keyIndex) => (
                              <div
                                key={keyIndex}
                                className="flex items-center gap-1"
                              >
                                <Badge
                                  variant="outline"
                                  className="px-2 py-1 font-mono text-xs"
                                >
                                  {key === "⌘" ? (
                                    <div className="flex items-center gap-1">
                                      <Command className="h-3 w-3" />
                                      <span>{key}</span>
                                    </div>
                                  ) : (
                                    key
                                  )}
                                </Badge>
                                {keyIndex < shortcut.keys.length - 1 && (
                                  <span className="text-muted-foreground text-xs">
                                    +
                                  </span>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => startRecording(shortcut.id)}
                            >
                              <Settings2 className="h-3 w-3" />
                              <span className="sr-only">Edit shortcut</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit shortcut</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
