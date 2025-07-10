import { createFileRoute } from "@tanstack/react-router";
import { Command, Keyboard, Zap } from "lucide-react";

import { Badge } from "@acme/ui/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@acme/ui/components/ui/card";

export const Route = createFileRoute("/_authenticated/shortcuts")({
  component: ShortcutsPage,
});

function ShortcutsPage() {
  const shortcuts = [
    {
      category: "Recording",
      items: [
        { keys: ["Space"], description: "Start/Stop recording" },
        { keys: ["Shift", "Space"], description: "Pause/Resume recording" },
        { keys: ["Cmd", "R"], description: "New recording" },
        { keys: ["Cmd", "S"], description: "Save current recording" },
      ],
    },
    {
      category: "Navigation",
      items: [
        { keys: ["Cmd", "1"], description: "Go to Dashboard" },
        { keys: ["Cmd", "2"], description: "Go to Transcriptions" },
        { keys: ["Cmd", "3"], description: "Go to Recording" },
        { keys: ["Cmd", "4"], description: "Go to History" },
        { keys: ["Cmd", "5"], description: "Go to Projects" },
        { keys: ["Cmd", "B"], description: "Toggle sidebar" },
      ],
    },
    {
      category: "Transcription",
      items: [
        { keys: ["Cmd", "T"], description: "New transcription" },
        { keys: ["Cmd", "E"], description: "Export transcription" },
        { keys: ["Cmd", "F"], description: "Find in transcription" },
        { keys: ["Cmd", "D"], description: "Duplicate transcription" },
        { keys: ["Delete"], description: "Delete selected transcription" },
      ],
    },
    {
      category: "General",
      items: [
        { keys: ["Cmd", ","], description: "Open preferences" },
        { keys: ["Cmd", "K"], description: "Open command palette" },
        { keys: ["Cmd", "Shift", "P"], description: "Command palette" },
        { keys: ["Cmd", "?"], description: "Show keyboard shortcuts" },
        { keys: ["Cmd", "Q"], description: "Quit application" },
        { keys: ["Cmd", "N"], description: "New window" },
        { keys: ["Cmd", "W"], description: "Close window" },
      ],
    },
    {
      category: "File Operations",
      items: [
        { keys: ["Cmd", "O"], description: "Open file" },
        { keys: ["Cmd", "Shift", "O"], description: "Open recent file" },
        { keys: ["Cmd", "I"], description: "Import audio file" },
        { keys: ["Cmd", "Shift", "E"], description: "Export all" },
        { keys: ["Cmd", "Shift", "S"], description: "Save as" },
      ],
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Keyboard Shortcuts
          </h1>
          <p className="text-muted-foreground">
            Speed up your workflow with these keyboard shortcuts
          </p>
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
                {category.category === "Recording" &&
                  "Control your recording sessions"}
                {category.category === "Navigation" &&
                  "Navigate around the application"}
                {category.category === "Transcription" &&
                  "Manage your transcriptions"}
                {category.category === "General" &&
                  "General application shortcuts"}
                {category.category === "File Operations" &&
                  "File management operations"}
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
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <div key={keyIndex} className="flex items-center gap-1">
                          <Badge
                            variant="outline"
                            className="px-2 py-1 font-mono text-xs"
                          >
                            {key === "Cmd" ? (
                              <div className="flex items-center gap-1">
                                <Command className="h-3 w-3" />
                                <span>Cmd</span>
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
              <h4 className="font-medium">⌨️ Custom Shortcuts</h4>
              <p className="text-muted-foreground text-sm">
                You can customize keyboard shortcuts in the Settings page to
                match your workflow.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">🎯 Context Aware</h4>
              <p className="text-muted-foreground text-sm">
                Some shortcuts work differently depending on what you're
                currently doing.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">🔄 Global vs Local</h4>
              <p className="text-muted-foreground text-sm">
                Global shortcuts work anywhere in the app, while local shortcuts
                are page-specific.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">💡 Learning Mode</h4>
              <p className="text-muted-foreground text-sm">
                Enable tooltip hints in settings to see shortcuts when hovering
                over buttons.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
