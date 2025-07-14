import { useCallback, useEffect, useState } from "react";
import { Keyboard } from "lucide-react";

import { Badge } from "@acme/ui/components/ui/badge";
import { Button } from "@acme/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@acme/ui/components/ui/dialog";

import { isValidShortcut, normalizeKeys } from "~/lib/shortcuts/utils";

interface ShortcutRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (keys: string[]) => void;
  actionName: string;
}

export function ShortcutRecorder({
  isOpen,
  onClose,
  onSave,
  actionName,
}: ShortcutRecorderProps) {
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    event.preventDefault();
    const { key, ctrlKey, altKey, shiftKey, metaKey } = event;

    const keys: string[] = [];

    if (metaKey) keys.push("Command");
    if (ctrlKey) keys.push("Control");
    if (altKey) keys.push("Alt");
    if (shiftKey) keys.push("Shift");

    const keyName = key.toLowerCase();
    if (!["control", "alt", "shift", "meta"].includes(keyName)) {
      // Handle special keys
      if (keyName === " ") {
        keys.push("Space");
      } else if (keyName.startsWith("arrow")) {
        keys.push(key); // Keep arrow keys as-is
      } else {
        keys.push(key.toUpperCase());
      }
    }

    const normalizedKeys = normalizeKeys(keys);
    setRecordedKeys(normalizedKeys);

    // Validate the shortcut
    if (keys.length > 0 && !isValidShortcut(normalizedKeys)) {
      setError(
        "Please include at least one modifier key (Ctrl, Alt, Shift, Cmd)",
      );
    } else {
      setError(null);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setRecordedKeys([]);
      setError(null);
      document.addEventListener("keydown", handleKeyDown);
    } else {
      document.removeEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  const handleSave = () => {
    if (isValidShortcut(recordedKeys)) {
      onSave(recordedKeys);
      onClose();
    }
  };

  const handleClear = () => {
    setRecordedKeys([]);
    setError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Shortcut for "{actionName}"</DialogTitle>
          <DialogDescription>
            Press the desired key combination. The new shortcut will be
            displayed below.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted flex min-h-[100px] items-center justify-center rounded-lg border-2 border-dashed">
          {recordedKeys.length > 0 ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                {recordedKeys.map((key, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="px-3 py-2 text-lg"
                  >
                    {key}
                  </Badge>
                ))}
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          ) : (
            <div className="text-muted-foreground flex flex-col items-center gap-2">
              <Keyboard className="h-8 w-8" />
              <span>Waiting for input...</span>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
          <Button
            onClick={handleSave}
            disabled={recordedKeys.length === 0 || !!error}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
