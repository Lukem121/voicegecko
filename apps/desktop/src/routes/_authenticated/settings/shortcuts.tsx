import { createFileRoute } from "@tanstack/react-router";
import { Command, Keyboard, RotateCcw, Settings2, Zap } from "lucide-react";

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

export const Route = createFileRoute("/_authenticated/settings/shortcuts")({
  component: ShortcutsPage,
});

function ShortcutsPage() {
  const handleResetShortcuts = () => {
    // TODO: Implement reset functionality
    console.log("Reset shortcuts to defaults");
  };

  const shortcuts = [
    {
      category: "Recording Controls",
      items: [
        {
          keys: ["Ctrl", "⊞"],
          description: "Push to dictate (hold to record)",
        },
        {
          keys: ["Ctrl", "Shift", "X"],
          description: "Toggle recording on/off",
        },
      ],
    },
    {
      category: "Navigation",
      items: [
        {
          keys: ["Ctrl", "Shift", "R"],
          description: "Open most recent transcription",
        },
        {
          keys: ["Ctrl", "Shift", "V"],
          description: "Paste last transcription into active text field",
        },
      ],
    },
    {
      category: "Post-Processing",
      items: [
        { keys: ["Ctrl", "1"], description: "Quick apply - Business style" },
        { keys: ["Ctrl", "2"], description: "Quick apply - Casual style" },
        { keys: ["Ctrl", "3"], description: "Quick apply - Grammar fix" },
        { keys: ["Ctrl", "P"], description: "Open post-processing menu" },
      ],
    },
  ];

  return (
    <TooltipProvider>
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
          {shortcuts.map((category) => (
            <Card key={category.category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Keyboard className="h-5 w-5" />
                  {category.category}
                </CardTitle>
                <CardDescription>
                  {category.category === "Recording Controls" &&
                    "Control your recording sessions"}
                  {category.category === "Navigation" &&
                    "Quick access to your transcriptions"}
                  {category.category === "Post-Processing" &&
                    "Process and enhance your transcriptions"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {category.items.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between border-b py-2 last:border-b-0"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, keyIndex) => (
                            <div
                              key={keyIndex}
                              className="flex items-center gap-1"
                            >
                              <Badge
                                variant="outline"
                                className="px-2 py-1 font-mono text-xs"
                              >
                                {key === "Ctrl" ? (
                                  <div className="flex items-center gap-1">
                                    <Command className="h-3 w-3" />
                                    <span>Ctrl</span>
                                  </div>
                                ) : key === "⊞" ? (
                                  <div className="flex items-center gap-1">
                                    <span>⊞</span>
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
                          ))}
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-50"
                              disabled
                            >
                              <Settings2 className="h-3 w-3" />
                              <span className="sr-only">Edit shortcut</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit shortcut (coming soon)</p>
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

        {/* Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Pro Tips
            </CardTitle>
            <CardDescription>
              Get the most out of VoiceGecko shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">🎙️ Push to Dictate</h4>
                <p className="text-muted-foreground text-sm">
                  Hold Ctrl + Windows key to record. Release to stop and
                  automatically process the transcription.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">🔄 Toggle Mode</h4>
                <p className="text-muted-foreground text-sm">
                  Use Ctrl + Shift + X for hands-free recording. Press once to
                  start, again to stop.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">⚡ Quick Processing</h4>
                <p className="text-muted-foreground text-sm">
                  Use Ctrl + 1/2/3 to quickly apply different text styles
                  without opening menus.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">🎯 Context Aware</h4>
                <p className="text-muted-foreground text-sm">
                  Some shortcuts work differently depending on whether you're
                  recording, transcribing, or editing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
